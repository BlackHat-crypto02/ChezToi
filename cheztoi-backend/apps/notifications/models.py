from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        RESERVATION_NOUVELLE = "reservation_nouvelle", "Nouvelle demande de réservation"
        RESERVATION_ACCEPTEE = "reservation_acceptee", "Réservation acceptée"
        RESERVATION_REFUSEE = "reservation_refusee", "Réservation refusée"
        RESERVATION_CONFIRMEE = "reservation_confirmee", "Réservation confirmée"
        RESERVATION_ANNULEE = "reservation_annulee", "Réservation annulée"
        MESSAGE = "message", "Nouveau message"
        ALERTE = "alerte", "Nouvelle annonce correspondant à une recherche"
        ANNONCE_VALIDEE = "annonce_validee", "Annonce validée"
        ANNONCE_REFUSEE = "annonce_refusee", "Annonce refusée"
        ANNONCE_SUSPENDUE = "annonce_suspendue", "Annonce suspendue"
        AVIS = "avis", "Nouvel avis"
        SIGNALEMENT = "signalement", "Signalement traité"
        SYSTEME = "systeme", "Information"

    destinataire = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(max_length=30, choices=Type.choices)
    titre = models.CharField(max_length=150)
    message = models.TextField(blank=True)
    # Cibles éventuelles : {"logement": 3, "reservation": 7, "conversation": 2}
    donnees = models.JSONField(default=dict, blank=True)
    lue = models.BooleanField(default=False)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-cree_le",)

    def __str__(self) -> str:
        return f"{self.destinataire} — {self.titre}"
