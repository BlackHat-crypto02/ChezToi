import secrets

from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.core.permissions import EstAdministrateur

from .invitations import InvitationInvalide, envoyer_invitation, lire_token
from .serializers import (
    AdminInvitationSerializer,
    AdminTokenObtainPairSerializer,
    MobileTokenObtainPairSerializer,
    RegisterSerializer,
    SetupPasswordSerializer,
    UserListSerializer,
    username_depuis_email,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Création de compte locataire ou propriétaire."""

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MobileLoginView(TokenObtainPairView):
    """Connexion de l'application mobile (e-mail ou identifiant)."""

    serializer_class = MobileTokenObtainPairSerializer


class AdminLoginView(TokenObtainPairView):
    """Connexion au back-office : admin uniquement."""

    serializer_class = AdminTokenObtainPairSerializer


class UserListView(generics.ListAPIView):
    """Liste des utilisateurs pour le tableau de bord admin (admin uniquement)."""

    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAuthenticated, EstAdministrateur]
    queryset = User.objects.all().order_by("-date_joined")


class AdminInvitationView(generics.CreateAPIView):
    """Crée un administrateur et envoie son lien de configuration par e-mail."""

    serializer_class = AdminInvitationSerializer
    permission_classes = [permissions.IsAuthenticated, EstAdministrateur]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data

        with transaction.atomic():
            utilisateur = User(
                username=username_depuis_email(donnees["email"]),
                email=donnees["email"],
                first_name=donnees["first_name"],
                last_name=donnees["last_name"],
                phone=donnees.get("phone", ""),
                role=User.Role.ADMIN,
                is_staff=True,
                is_active=True,
                verified=False,
                password_temporary=True,
            )
            # Mot de passe aléatoire : seul le lien d'invitation est transmis.
            utilisateur.set_password(secrets.token_urlsafe(24))
            utilisateur.save()

            try:
                envoyer_invitation(utilisateur)
            except Exception as erreur:
                raise APIException(
                    "L'e-mail d'invitation n'a pas pu être envoyé. "
                    "Le compte n'a pas été créé."
                ) from erreur

            utilisateur.invitation_sent_at = timezone.now()
            utilisateur.save(update_fields=["invitation_sent_at"])

        return Response(
            {
                "message": "Administrateur créé.",
                "user": {
                    "id": utilisateur.id,
                    "email": utilisateur.email,
                    "first_name": utilisateur.first_name,
                    "last_name": utilisateur.last_name,
                    "role": utilisateur.role,
                    "invitation_en_attente": True,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class RenvoyerInvitationView(APIView):
    """Renvoie le lien de configuration d'un administrateur en attente."""

    permission_classes = [permissions.IsAuthenticated, EstAdministrateur]

    def post(self, request, pk):
        utilisateur = get_object_or_404(User, pk=pk, role=User.Role.ADMIN)
        if not utilisateur.is_active:
            return Response(
                {"detail": "Ce compte est désactivé."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not utilisateur.password_temporary:
            return Response(
                {
                    "detail": (
                        "Cette personne a déjà choisi son mot de passe."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            envoyer_invitation(utilisateur)
        except Exception:
            return Response(
                {"detail": "L'e-mail n'a pas pu être envoyé."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        utilisateur.invitation_sent_at = timezone.now()
        utilisateur.save(update_fields=["invitation_sent_at"])
        return Response(
            {"message": f"Invitation renvoyée à {utilisateur.email}."}
        )


class SetupPasswordView(APIView):
    """Page publique : vérification du lien puis choix du mot de passe."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        token = request.query_params.get("token", "")
        try:
            utilisateur = lire_token(token)
        except InvitationInvalide as erreur:
            return Response(
                {"detail": str(erreur)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "email": utilisateur.email,
                "first_name": utilisateur.first_name,
            }
        )

    def post(self, request):
        serializer = SetupPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data
        utilisateur = donnees["user"]

        with transaction.atomic():
            utilisateur.set_password(donnees["password"])
            utilisateur.password_temporary = False
            utilisateur.verified = True
            utilisateur.save(
                update_fields=["password", "password_temporary", "verified"]
            )

        return Response(
            {
                "message": (
                    "Mot de passe défini. Vous pouvez maintenant vous connecter."
                )
            }
        )
