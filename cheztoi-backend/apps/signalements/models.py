from django.conf import settings
from django.db import models


class Signalement(models.Model):
    """Signalement ou litige soumis par un utilisateur, traité par l'admin."""

    class Motif(models.TextChoices):
        FAUSSE_ANNONCE = "fausse_annonce", "Fausse annonce"
        LOGEMENT_INEXISTANT = "logement_inexistant", "Logement inexistant"
        PHOTOS_TROMPEUSES = "photos_trompeuses", "Photos trompeuses"
        FRAUDE = "fraude", "Tentative de fraude"
        COMPORTEMENT_ABUSIF = "comportement_abusif", "Comportement abusif"
        PROBLEME_RESERVATION = "probleme_reservation", "Problème de réservation"
        AVIS_INAPPROPRIE = "avis_inapproprie", "Avis inapproprié"
        AUTRE = "autre", "Autre"

    class Statut(models.TextChoices):
        OUVERT = "ouvert", "Ouvert"
        EN_COURS = "en_cours", "En cours de traitement"
        RESOLU = "resolu", "Résolu"
        REJETE = "rejete", "Rejeté"

    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="signalements_emis",
    )
    motif = models.CharField(max_length=30, choices=Motif.choices)
    description = models.TextField(blank=True)
    piece_jointe = models.FileField(
        upload_to="signalements/%Y/%m/", null=True, blank=True
    )

    # Une seule cible renseignée en pratique.
    logement = models.ForeignKey(
        "logements.Logement",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="signalements",
    )
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="signalements_recus",
    )
    reservation = models.ForeignKey(
        "reservations.Reservation",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="signalements",
    )
    avis = models.ForeignKey(
        "reservations.Avis",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="signalements",
    )
    conversation = models.ForeignKey(
        "messagerie.Conversation",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="signalements",
    )

    statut = models.CharField(
        max_length=20,
        choices=Statut.choices,
        default=Statut.OUVERT,
    )
    decision = models.TextField(blank=True)
    traite_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-cree_le",)

    @property
    def cible(self):
        if self.logement_id:
            return "logement"
        if self.utilisateur_id:
            return "utilisateur"
        if self.reservation_id:
            return "reservation"
        if self.avis_id:
            return "avis"
        if self.conversation_id:
            return "conversation"
        return "autre"
