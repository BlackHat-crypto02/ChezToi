from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Utilisateur ChezToi, partagé par le mobile et le web."""

    class Role(models.TextChoices):
        LOCATAIRE = "locataire", "Locataire"
        PROPRIETAIRE = "proprietaire", "Propriétaire"
        ADMIN = "admin", "Administrateur"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.LOCATAIRE,
    )
    phone = models.CharField(max_length=20, blank=True)
    city = models.CharField(max_length=100, blank=True)
    verified = models.BooleanField(
        default=False,
        verbose_name="vérifié",
        help_text="Compte dont l'identité a été vérifiée par l'administration.",
    )
    password_temporary = models.BooleanField(
        default=False,
        verbose_name="mot de passe temporaire",
        help_text="Le compteur doit encore choisir son mot de passe via l'invitation.",
    )
    invitation_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="invitation envoyée le",
    )

    def __str__(self) -> str:
        return self.get_full_name() or self.username
