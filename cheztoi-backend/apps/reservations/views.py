from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, serializers, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.logements.models import Logement
from apps.notifications.models import Notification
from apps.notifications.services import notifier

from .models import Avis, Reservation
from .serializers import (
    AvisSerializer,
    ReservationCreationSerializer,
    ReservationSerializer,
)
from .services import actualiser_statuts


def base_queryset():
    return Reservation.objects.select_related(
        "logement",
        "logement__proprietaire",
        "locataire",
        "avis",
    ).prefetch_related("logement__photos")


def reponse(request, reservation, code=status.HTTP_200_OK):
    reservation = base_queryset().get(pk=reservation.pk)
    return Response(
        ReservationSerializer(reservation, context={"request": request}).data,
        status=code,
    )


class EstimationView(APIView):
    """Calcule le montant d'une période sans créer de réservation."""

    def post(self, request):
        serializer = ReservationCreationSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data
        brouillon = Reservation(
            logement=donnees["logement"],
            date_debut=donnees["date_debut"],
            date_fin=donnees["date_fin"],
        )
        brouillon.calculer_montants()
        return Response(
            {
                "periodes": brouillon.periodes,
                "periodicite": brouillon.logement.periodicite,
                "montant_location": brouillon.montant_location,
                "caution": brouillon.caution,
                "avance": brouillon.avance,
                "frais": brouillon.frais,
                "montant_total": brouillon.montant_total,
                "reservation_instantanee": brouillon.logement.reservation_instantanee,
            }
        )


class MesReservationsView(generics.ListCreateAPIView):
    """GET : réservations du locataire connecté. POST : nouvelle demande."""

    serializer_class = ReservationSerializer

    def get_queryset(self):
        actualiser_statuts()
        queryset = base_queryset().filter(locataire=self.request.user)
        statut = self.request.query_params.get("statut")
        if statut:
            queryset = queryset.filter(statut__in=statut.split(","))
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = ReservationCreationSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data
        logement = donnees["logement"]

        with transaction.atomic():
            # Verrou sur le logement pour éviter deux réservations simultanées.
            Logement.objects.select_for_update().filter(pk=logement.pk).first()
            reservation = Reservation(locataire=request.user, **donnees)
            if reservation.chevauchements().exists():
                raise ValidationError(
                    "Le logement vient d'être réservé sur cette période."
                )
            reservation.calculer_montants()
            if logement.reservation_instantanee:
                reservation.statut = Reservation.Statut.CONFIRMEE
            reservation.save()

        nom = request.user.get_full_name() or request.user.username
        if reservation.statut == Reservation.Statut.CONFIRMEE:
            notifier(
                logement.proprietaire,
                Notification.Type.RESERVATION_CONFIRMEE,
                "Nouvelle réservation confirmée",
                f"{nom} a réservé « {logement.titre} » du "
                f"{reservation.date_debut:%d/%m/%Y} au {reservation.date_fin:%d/%m/%Y}.",
                reservation=reservation.pk,
                logement=logement.pk,
            )
        else:
            notifier(
                logement.proprietaire,
                Notification.Type.RESERVATION_NOUVELLE,
                "Nouvelle demande de réservation",
                f"{nom} souhaite louer « {logement.titre} » du "
                f"{reservation.date_debut:%d/%m/%Y} au {reservation.date_fin:%d/%m/%Y}.",
                reservation=reservation.pk,
                logement=logement.pk,
            )
        return reponse(request, reservation, status.HTTP_201_CREATED)


class ReservationsRecuesView(generics.ListAPIView):
    """Demandes reçues par le propriétaire connecté."""

    serializer_class = ReservationSerializer

    def get_queryset(self):
        actualiser_statuts()
        queryset = base_queryset().filter(logement__proprietaire=self.request.user)
        statut = self.request.query_params.get("statut")
        if statut:
            queryset = queryset.filter(statut__in=statut.split(","))
        logement = self.request.query_params.get("logement")
        if logement and logement.isdigit():
            queryset = queryset.filter(logement_id=int(logement))
        return queryset


def reservation_visible(request, pk):
    return get_object_or_404(
        base_queryset().filter(
            Q(locataire=request.user) | Q(logement__proprietaire=request.user)
        ),
        pk=pk,
    )


class ReservationDetailView(APIView):
    def get(self, request, pk):
        actualiser_statuts()
        return reponse(request, reservation_visible(request, pk))


class ReservationActionView(APIView):
    """accepter / refuser (propriétaire), annuler (les deux), modifier (locataire)."""

    def post(self, request, pk, action):
        reservation = reservation_visible(request, pk)
        est_proprietaire = reservation.logement.proprietaire_id == request.user.id
        est_locataire = reservation.locataire_id == request.user.id
        motif = str(request.data.get("motif", "")).strip()
        logement = reservation.logement

        if action in ("accepter", "refuser") and not est_proprietaire:
            raise PermissionDenied("Seul le propriétaire peut répondre à la demande.")

        if action == "accepter":
            if reservation.statut != Reservation.Statut.EN_ATTENTE:
                raise ValidationError("Cette demande n'est plus en attente.")
            with transaction.atomic():
                if reservation.chevauchements().exists():
                    raise ValidationError(
                        "Une autre réservation occupe déjà cette période."
                    )
                reservation.statut = Reservation.Statut.CONFIRMEE
                reservation.save(update_fields=["statut", "modifie_le"])
                # Les autres demandes sur la même période deviennent caduques.
                concurrentes = Reservation.objects.filter(
                    logement=logement,
                    statut=Reservation.Statut.EN_ATTENTE,
                    date_debut__lt=reservation.date_fin,
                    date_fin__gt=reservation.date_debut,
                ).exclude(pk=reservation.pk)
                for autre in concurrentes:
                    autre.statut = Reservation.Statut.REFUSEE
                    autre.motif = "Le logement a été réservé par quelqu'un d'autre sur cette période."
                    autre.save(update_fields=["statut", "motif", "modifie_le"])
                    notifier(
                        autre.locataire,
                        Notification.Type.RESERVATION_REFUSEE,
                        "Demande de réservation refusée",
                        f"« {logement.titre} » n'est plus disponible sur ces dates.",
                        reservation=autre.pk,
                        logement=logement.pk,
                    )
            notifier(
                reservation.locataire,
                Notification.Type.RESERVATION_ACCEPTEE,
                "Réservation acceptée 🎉",
                f"Votre demande pour « {logement.titre} » a été acceptée.",
                reservation=reservation.pk,
                logement=logement.pk,
            )

        elif action == "refuser":
            if reservation.statut != Reservation.Statut.EN_ATTENTE:
                raise ValidationError("Cette demande n'est plus en attente.")
            reservation.statut = Reservation.Statut.REFUSEE
            reservation.motif = motif
            reservation.save(update_fields=["statut", "motif", "modifie_le"])
            notifier(
                reservation.locataire,
                Notification.Type.RESERVATION_REFUSEE,
                "Demande de réservation refusée",
                f"Votre demande pour « {logement.titre} » a été refusée."
                + (f" Motif : {motif}" if motif else ""),
                reservation=reservation.pk,
                logement=logement.pk,
            )

        elif action == "annuler":
            if reservation.statut not in (
                Reservation.Statut.EN_ATTENTE,
                Reservation.Statut.ACCEPTEE,
                Reservation.Statut.CONFIRMEE,
            ):
                raise ValidationError("Cette réservation ne peut plus être annulée.")
            reservation.statut = Reservation.Statut.ANNULEE
            reservation.motif = motif
            reservation.save(update_fields=["statut", "motif", "modifie_le"])
            destinataire = logement.proprietaire if est_locataire else reservation.locataire
            notifier(
                destinataire,
                Notification.Type.RESERVATION_ANNULEE,
                "Réservation annulée",
                f"La réservation #{reservation.pk} pour « {logement.titre} » a été annulée."
                + (f" Motif : {motif}" if motif else ""),
                reservation=reservation.pk,
                logement=logement.pk,
            )

        elif action == "modifier":
            if not est_locataire:
                raise PermissionDenied("Seul le locataire peut modifier sa demande.")
            if reservation.statut != Reservation.Statut.EN_ATTENTE:
                raise ValidationError(
                    "Seule une demande en attente peut être modifiée. "
                    "Pour prolonger un séjour, faites une nouvelle demande."
                )
            serializer = ReservationCreationSerializer(
                data={
                    "logement": logement.pk,
                    "date_debut": request.data.get("date_debut", reservation.date_debut),
                    "date_fin": request.data.get("date_fin", reservation.date_fin),
                    "nombre_personnes": request.data.get(
                        "nombre_personnes", reservation.nombre_personnes
                    ),
                    "message": request.data.get("message", reservation.message),
                },
                context={"request": request},
            )
            serializer.is_valid(raise_exception=True)
            for champ in ("date_debut", "date_fin", "nombre_personnes", "message"):
                setattr(reservation, champ, serializer.validated_data[champ])
            reservation.calculer_montants()
            reservation.save()
        else:
            raise ValidationError("Action inconnue.")

        return reponse(request, reservation)


class AvisLogementView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = AvisSerializer

    def get_queryset(self):
        return Avis.objects.filter(
            logement_id=self.kwargs["pk"], masque=False
        ).select_related("auteur")


class AvisCreationView(APIView):
    """Le locataire évalue une réservation terminée."""

    def post(self, request, pk):
        actualiser_statuts()
        reservation = get_object_or_404(
            Reservation, pk=pk, locataire=request.user
        )
        if reservation.statut != Reservation.Statut.TERMINEE:
            raise ValidationError("Vous pourrez donner votre avis une fois le séjour terminé.")
        if Avis.objects.filter(reservation=reservation).exists():
            raise ValidationError("Vous avez déjà donné votre avis sur ce séjour.")
        serializer = AvisSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        avis = serializer.save(
            reservation=reservation,
            logement=reservation.logement,
            auteur=request.user,
        )
        notifier(
            reservation.logement.proprietaire,
            Notification.Type.AVIS,
            "Nouvel avis sur votre logement",
            f"« {reservation.logement.titre} » a reçu la note {avis.note_globale}/5.",
            logement=reservation.logement_id,
        )
        return Response(AvisSerializer(avis).data, status=status.HTTP_201_CREATED)


class ReponseAvisSerializer(serializers.Serializer):
    reponse = serializers.CharField(max_length=2000)


class AvisReponseView(APIView):
    """Le propriétaire répond publiquement à un avis."""

    def post(self, request, pk):
        avis = get_object_or_404(Avis, pk=pk, logement__proprietaire=request.user)
        serializer = ReponseAvisSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        avis.reponse_proprietaire = serializer.validated_data["reponse"]
        avis.save(update_fields=["reponse_proprietaire"])
        return Response(AvisSerializer(avis).data)


class AvisRecusView(generics.ListAPIView):
    """Avis reçus par le propriétaire sur l'ensemble de ses logements."""

    serializer_class = AvisSerializer

    def get_queryset(self):
        return Avis.objects.filter(
            logement__proprietaire=self.request.user
        ).select_related("auteur")
