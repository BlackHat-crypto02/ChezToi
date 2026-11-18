"""Gestion du compte depuis l'application mobile : profil, mot de passe, suppression."""

import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework import parsers, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CodeReinitialisation

User = get_user_model()

DUREE_CODE = timedelta(minutes=15)
TENTATIVES_MAX = 5


def profil(user, request=None):
    photo = None
    if user.photo:
        photo = request.build_absolute_uri(user.photo.url) if request else user.photo.url
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "phone": user.phone,
        "city": user.city,
        "bio": user.bio,
        "photo": photo,
        "verified": user.verified,
        "date_joined": user.date_joined,
    }


class ProfilSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("first_name", "last_name", "phone", "city", "bio", "role", "photo")
        extra_kwargs = {
            "photo": {"required": False, "allow_null": True},
        }

    def validate_role(self, value):
        # On peut passer de locataire à propriétaire et inversement, jamais admin.
        if value not in (User.Role.LOCATAIRE, User.Role.PROPRIETAIRE):
            raise serializers.ValidationError("Rôle non autorisé.")
        if self.instance and self.instance.role == User.Role.ADMIN:
            raise serializers.ValidationError("Un administrateur ne change pas de rôle.")
        return value


class MeView(APIView):
    """GET : profil. PATCH : modification. DELETE : suppression du compte."""

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser]

    def get(self, request):
        return Response(profil(request.user, request))

    def patch(self, request):
        serializer = ProfilSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(profil(request.user, request))

    def delete(self, request):
        mot_de_passe = str(request.data.get("password", ""))
        if not request.user.check_password(mot_de_passe):
            return Response(
                {"detail": "Mot de passe incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = request.user
        # Anonymisation plutôt que suppression : l'historique des réservations
        # et des messages des autres utilisateurs reste cohérent.
        with transaction.atomic():
            user.is_active = False
            user.email = f"supprime-{user.pk}@cheztoi.invalid"
            user.username = f"supprime-{user.pk}"
            user.first_name = "Compte"
            user.last_name = "supprimé"
            user.phone = ""
            user.bio = ""
            if user.photo:
                user.photo.delete(save=False)
            user.set_unusable_password()
            user.save()
            user.logements.exclude(statut="archivee").update(statut="archivee")
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangerMotDePasseSerializer(serializers.Serializer):
    ancien = serializers.CharField()
    nouveau = serializers.CharField(min_length=8)

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["ancien"]):
            raise serializers.ValidationError({"ancien": "Mot de passe actuel incorrect."})
        validate_password(attrs["nouveau"], user)
        return attrs


class ChangerMotDePasseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangerMotDePasseSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["nouveau"])
        request.user.save(update_fields=["password"])
        return Response({"message": "Mot de passe modifié."})


class DemandeReinitialisationView(APIView):
    """Envoie un code à 6 chiffres. Réponse identique que le compte existe ou non."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user is not None:
            code = f"{secrets.randbelow(1_000_000):06d}"
            CodeReinitialisation.objects.filter(user=user, utilise=False).update(
                utilise=True
            )
            CodeReinitialisation.objects.create(
                user=user,
                code_hash=make_password(code),
                expire_le=timezone.now() + DUREE_CODE,
            )
            send_mail(
                "ChezToi — code de réinitialisation",
                (
                    f"Bonjour {user.first_name or user.username},\n\n"
                    f"Votre code de réinitialisation est : {code}\n"
                    "Il est valable 15 minutes.\n\n"
                    "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n\n"
                    "L'équipe ChezToi"
                ),
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=True,
            )
        return Response(
            {
                "message": (
                    "Si un compte correspond à cette adresse, un code vient d'être envoyé."
                )
            }
        )


class ConfirmationReinitialisationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(min_length=6, max_length=6)
    password = serializers.CharField(min_length=8)


class ConfirmationReinitialisationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ConfirmationReinitialisationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data
        erreur = Response(
            {"detail": "Code invalide ou expiré."},
            status=status.HTTP_400_BAD_REQUEST,
        )

        user = User.objects.filter(email__iexact=donnees["email"], is_active=True).first()
        if user is None:
            return erreur
        demande = (
            CodeReinitialisation.objects.filter(
                user=user, utilise=False, expire_le__gt=timezone.now()
            )
            .order_by("-cree_le")
            .first()
        )
        if demande is None or demande.tentatives >= TENTATIVES_MAX:
            return erreur
        if not check_password(donnees["code"], demande.code_hash):
            demande.tentatives += 1
            demande.save(update_fields=["tentatives"])
            return erreur

        try:
            validate_password(donnees["password"], user)
        except DjangoValidationError as exc:
            return Response(
                {"password": list(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(donnees["password"])
        user.save(update_fields=["password"])
        demande.utilise = True
        demande.save(update_fields=["utilise"])
        return Response(
            {"message": "Mot de passe réinitialisé. Vous pouvez vous connecter."}
        )
