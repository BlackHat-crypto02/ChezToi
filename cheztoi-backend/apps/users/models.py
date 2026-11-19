import uuid
from pathlib import Path

from django.contrib.auth.models import AbstractUser
from django.db import models


def chemin_justificatif(instance, nom):
    """Nom aléatoire : un document d'identité ne doit pas avoir d'URL devinable."""
    return f"justificatifs/{uuid.uuid4().hex}{Path(nom).suffix.lower()}"


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
    # Catégories désactivées par l'utilisateur : {"messages": false, ...}
    preferences_notifications = models.JSONField(default=dict, blank=True)

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


class Justificatif(models.Model):
    """Pièce envoyée par un propriétaire pour faire vérifier son compte."""

    class Type(models.TextChoices):
        PIECE_IDENTITE = "piece_identite", "Pièce d'identité"
        TITRE_PROPRIETE = "titre_propriete", "Titre de propriété ou bail"
        JUSTIFICATIF_DOMICILE = "justificatif_domicile", "Justificatif de domicile"
        AUTRE = "autre", "Autre document"

    class Statut(models.TextChoices):
        EN_ATTENTE = "en_attente", "En attente"
        ACCEPTE = "accepte", "Accepté"
        REFUSE = "refuse", "Refusé"

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="justificatifs",
    )
    type = models.CharField(max_length=30, choices=Type.choices)
    fichier = models.FileField(upload_to=chemin_justificatif)
    statut = models.CharField(
        max_length=20,
        choices=Statut.choices,
        default=Statut.EN_ATTENTE,
    )
    motif = models.TextField(blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)
    traite_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-cree_le",)
