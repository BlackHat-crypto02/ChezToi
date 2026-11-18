import re

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    PermissionDenied,
)
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .invitations import InvitationInvalide, lire_token

User = get_user_model()


class ConflitError(APIException):
    """E-mail déjà utilisé (équivalent du 409 d'Orbit)."""

    status_code = 409
    default_detail = "Cette ressource existe déjà."
    default_code = "conflit"


def username_depuis_email(email):
    """Génère un identifiant unique à partir de l'adresse e-mail."""
    base = re.sub(r"[^a-zA-Z0-9._-]", "", email.split("@")[0].lower())
    if not base:
        base = "utilisateur"
    candidat = base
    suffixe = 1
    while User.objects.filter(username__iexact=candidat).exists():
        suffixe += 1
        candidat = f"{base}{suffixe}"
    return candidat


class RegisterSerializer(serializers.ModelSerializer):
    """Inscription publique : locataire ou propriétaire uniquement."""

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"},
    )
    username = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=150,
    )

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "password",
            "role",
            "phone",
            "city",
        )
        extra_kwargs = {
            "email": {"required": True},
            "first_name": {"required": False, "allow_blank": True},
            "last_name": {"required": False, "allow_blank": True},
            "phone": {"required": False, "allow_blank": True},
            "city": {"required": False, "allow_blank": True},
        }

    def validate_role(self, value):
        if value == User.Role.ADMIN:
            raise serializers.ValidationError(
                "Le rôle administrateur ne peut pas être créé depuis l'application."
            )
        return value

    def validate_email(self, value):
        email = str(value).strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Cette adresse e-mail est déjà utilisée.")
        return email

    def validate_username(self, value):
        username = str(value).strip()
        if username and User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà utilisé.")
        return username

    def _username_depuis_email(self, email):
        return username_depuis_email(email)

    def create(self, validated_data):
        password = validated_data.pop("password")
        username = validated_data.pop("username", "").strip()
        if not username:
            username = self._username_depuis_email(validated_data["email"])
        return User.objects.create_user(
            username=username,
            password=password,
            **validated_data,
        )


class UserListSerializer(serializers.ModelSerializer):
    """Lecture seule : lignes du tableau Utilisateurs du back-office."""

    nom_complet = serializers.SerializerMethodField()
    invitation_en_attente = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "nom_complet",
            "phone",
            "role",
            "verified",
            "invitation_en_attente",
            "is_active",
            "date_joined",
            "city",
        )
        read_only_fields = fields

    def get_nom_complet(self, obj):
        return obj.get_full_name() or obj.username

    def get_invitation_en_attente(self, obj):
        return bool(obj.password_temporary and obj.invitation_sent_at)


class AdminInvitationSerializer(serializers.Serializer):
    """Création d'un compte administrateur par un administrateur."""

    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
    )

    def validate_first_name(self, value):
        return str(value).strip()

    def validate_last_name(self, value):
        return str(value).strip()

    def validate_email(self, value):
        email = str(value).strip().lower()
        existant = User.objects.filter(email__iexact=email).first()
        if existant is not None:
            if not existant.is_active:
                raise ConflitError(
                    "Un compte désactivé utilise déjà cette adresse. "
                    "Réactivez-le plutôt que d'en créer un nouveau."
                )
            raise ConflitError(
                "Un compte existe déjà avec cette adresse e-mail."
            )
        return email


class SetupPasswordSerializer(serializers.Serializer):
    """Choix du mot de passe depuis le lien d'invitation."""

    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirmation = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        if attrs["password"] != attrs["confirmation"]:
            raise serializers.ValidationError(
                {"confirmation": "Les mots de passe ne correspondent pas."}
            )
        try:
            user = lire_token(attrs["token"])
        except InvitationInvalide as erreur:
            raise serializers.ValidationError({"token": str(erreur)}) from erreur

        validate_password(attrs["password"], user)
        attrs["user"] = user
        return attrs


class MobileTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Connexion mobile : accepte l'adresse e-mail ou le nom d'utilisateur."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields[self.username_field].required = False
        self.fields[self.username_field].allow_blank = True
        self.fields["email"] = serializers.EmailField(
            required=False,
            allow_blank=True,
        )

    def validate(self, attrs):
        email = str(attrs.pop("email", "") or "").strip()
        username = str(attrs.get(self.username_field, "") or "").strip()

        if not username and email:
            user = User.objects.filter(email__iexact=email).first()
            if user is None:
                raise AuthenticationFailed(
                    "Aucun compte n'est associé à cette adresse e-mail."
                )
            attrs[self.username_field] = user.username
        elif not username:
            raise AuthenticationFailed("Veuillez saisir votre adresse e-mail.")
        else:
            attrs[self.username_field] = username

        try:
            data = super().validate(attrs)
        except AuthenticationFailed:
            raise AuthenticationFailed("Identifiants incorrects.") from None

        user = self.user
        from .compte import profil

        data["user"] = profil(user, self.context.get("request"))
        return data


class AdminTokenObtainPairSerializer(TokenObtainPairSerializer):
    """JWT réservé au back-office : e-mail ou identifiant, admin uniquement."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields[self.username_field].required = False
        self.fields[self.username_field].allow_blank = True
        self.fields["email"] = serializers.EmailField(
            required=False,
            allow_blank=True,
        )

    def validate(self, attrs):
        email = str(attrs.pop("email", "") or "").strip()
        username = str(attrs.get(self.username_field, "") or "").strip()

        if not username and email:
            user = User.objects.filter(email__iexact=email).first()
            if user is None:
                raise AuthenticationFailed(
                    "Aucun compte n'est associé à cette adresse e-mail."
                )
            attrs[self.username_field] = user.username
        elif not username:
            raise AuthenticationFailed("Veuillez saisir votre adresse e-mail.")
        else:
            attrs[self.username_field] = username

        data = super().validate(attrs)
        user = self.user
        if user.role != User.Role.ADMIN or not user.is_staff:
            raise PermissionDenied(
                "Seuls les administrateurs peuvent accéder à l'administration."
            )
        data["user"] = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
        }
        return data
