from django.conf import settings
from django.db import models

from apps.logements.models import Logement


class Conversation(models.Model):
    """Fil de discussion entre un locataire et un propriétaire."""

    locataire = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversations_locataire",
    )
    proprietaire = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversations_proprietaire",
    )
    logement = models.ForeignKey(
        Logement,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conversations",
    )
    reservation = models.ForeignKey(
        "reservations.Reservation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conversations",
    )
    bloquee_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        help_text="Participant ayant bloqué l'autre : plus aucun envoi possible.",
    )
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-modifie_le",)

    def participants(self):
        return (self.locataire_id, self.proprietaire_id)

    def autre(self, user):
        return self.proprietaire if user.id == self.locataire_id else self.locataire


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="messages_envoyes",
    )
    texte = models.TextField(blank=True)
    image = models.ImageField(upload_to="messages/%Y/%m/", null=True, blank=True)
    lu = models.BooleanField(default=False)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("cree_le",)
