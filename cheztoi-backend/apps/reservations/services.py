from django.db.models import Q
from django.utils import timezone

from .models import Reservation


def actualiser_statuts():
    """Fait avancer les réservations selon la date du jour (appel léger, idempotent)."""
    aujourd_hui = timezone.localdate()
    Reservation.objects.filter(
        statut=Reservation.Statut.EN_ATTENTE,
        date_debut__lt=aujourd_hui,
    ).update(
        statut=Reservation.Statut.ANNULEE,
        motif="Demande expirée sans réponse du propriétaire.",
    )
    Reservation.objects.filter(
        Q(statut=Reservation.Statut.CONFIRMEE) | Q(statut=Reservation.Statut.ACCEPTEE),
        date_debut__lte=aujourd_hui,
        date_fin__gt=aujourd_hui,
    ).update(statut=Reservation.Statut.EN_COURS)
    Reservation.objects.filter(
        statut__in=(
            Reservation.Statut.CONFIRMEE,
            Reservation.Statut.ACCEPTEE,
            Reservation.Statut.EN_COURS,
        ),
        date_fin__lte=aujourd_hui,
    ).update(statut=Reservation.Statut.TERMINEE)
