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
    photo = models.ImageField(upload_to="profils/", null=True, blank=True)
    bio = models.TextField(blank=True)

    def __str__(self) -> str:
        return self.get_full_name() or self.username


class CodeReinitialisation(models.Model):
    """Code à 6 chiffres envoyé par e-mail pour réinitialiser le mot de passe."""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="codes_reinitialisation",
    )
    code_hash = models.CharField(max_length=128)
    expire_le = models.DateTimeField()
    tentatives = models.PositiveSmallIntegerField(default=0)
    utilise = models.BooleanField(default=False)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-cree_le",)
