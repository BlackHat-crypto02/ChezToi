import math

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.logements.models import Logement

# Durée (en jours) d'une unité de facturation selon la périodicité du prix.
JOURS_PAR_PERIODE = {
    Logement.Periodicite.NUIT: 1,
    Logement.Periodicite.SEMAINE: 7,
    Logement.Periodicite.MOIS: 30,
    Logement.Periodicite.ANNEE: 365,
}


def nombre_periodes(logement, date_debut, date_fin):
    """Nombre d'unités facturées (arrondi au supérieur, minimum 1)."""
    jours = max((date_fin - date_debut).days, 1)
    return max(1, math.ceil(jours / JOURS_PAR_PERIODE[logement.periodicite]))


class Reservation(models.Model):
    class Statut(models.TextChoices):
        EN_ATTENTE = "en_attente", "En attente"
        ACCEPTEE = "acceptee", "Acceptée"
        REFUSEE = "refusee", "Refusée"
        CONFIRMEE = "confirmee", "Confirmée"
        EN_COURS = "en_cours", "En cours"
        TERMINEE = "terminee", "Terminée"
        ANNULEE = "annulee", "Annulée"
        EN_LITIGE = "en_litige", "En litige"

    # Statuts qui bloquent le calendrier du logement.
    BLOQUANTS = (
        Statut.ACCEPTEE,
        Statut.CONFIRMEE,
        Statut.EN_COURS,
        Statut.EN_LITIGE,
    )

    logement = models.ForeignKey(
        Logement,
        on_delete=models.CASCADE,
        related_name="reservations",
    )
    locataire = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reservations",
    )
    date_debut = models.DateField()
    date_fin = models.DateField()
    nombre_personnes = models.PositiveSmallIntegerField(default=1)
    message = models.TextField(blank=True)

    # Montants figés au moment de la demande.
    periodes = models.PositiveIntegerField(default=1)
    montant_location = models.PositiveIntegerField(default=0)
    caution = models.PositiveIntegerField(default=0)
    avance = models.PositiveIntegerField(default=0)
    frais = models.PositiveIntegerField(default=0)
    montant_total = models.PositiveIntegerField(default=0)

    statut = models.CharField(
        max_length=20,
        choices=Statut.choices,
        default=Statut.EN_ATTENTE,
    )
    motif = models.TextField(
        blank=True,
        help_text="Motif du refus ou de l'annulation.",
    )
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-cree_le",)

    def __str__(self) -> str:
        return f"#{self.pk} {self.logement} ({self.date_debut} → {self.date_fin})"

    def calculer_montants(self):
        logement = self.logement
        self.periodes = nombre_periodes(logement, self.date_debut, self.date_fin)
        self.montant_location = logement.prix * self.periodes
        self.caution = logement.caution
        self.avance = logement.avance
        self.frais = logement.frais_supplementaires + logement.charges
        self.montant_total = (
            self.montant_location + self.caution + self.avance + self.frais
        )

    def chevauchements(self):
        """Réservations bloquantes qui recouvrent la période [début, fin)."""
        return (
            Reservation.objects.filter(
                logement=self.logement,
                statut__in=self.BLOQUANTS,
                date_debut__lt=self.date_fin,
                date_fin__gt=self.date_debut,
            )
            .exclude(pk=self.pk)
        )


class Avis(models.Model):
    """Évaluation laissée par un locataire après une location terminée."""

    note_validators = [MinValueValidator(1), MaxValueValidator(5)]

    reservation = models.OneToOneField(
        Reservation,
        on_delete=models.CASCADE,
        related_name="avis",
    )
    logement = models.ForeignKey(
        Logement,
        on_delete=models.CASCADE,
        related_name="avis",
    )
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="avis_ecrits",
    )
    note_etat = models.PositiveSmallIntegerField(validators=note_validators)
    note_conformite = models.PositiveSmallIntegerField(validators=note_validators)
    note_proprete = models.PositiveSmallIntegerField(validators=note_validators)
    note_communication = models.PositiveSmallIntegerField(validators=note_validators)
    note_qualite_prix = models.PositiveSmallIntegerField(validators=note_validators)
    note_globale = models.FloatField(default=0)
    commentaire = models.TextField(blank=True)
    reponse_proprietaire = models.TextField(blank=True)
    masque = models.BooleanField(
        default=False,
        help_text="Masqué par la modération.",
    )
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-cree_le",)
        verbose_name_plural = "avis"

    def save(self, *args, **kwargs):
        notes = (
            self.note_etat,
            self.note_conformite,
            self.note_proprete,
            self.note_communication,
            self.note_qualite_prix,
        )
        self.note_globale = round(sum(notes) / len(notes), 1)
        super().save(*args, **kwargs)
