"""API du back-office Next.js (administrateurs uniquement)."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, serializers
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import EstAdministrateur
from apps.core.serializers import UtilisateurPublicSerializer
from apps.logements.models import Equipement, Logement
from apps.logements.serializers import EquipementSerializer, LogementDetailSerializer
from apps.logements.services import annoter, notifier_alertes
from apps.notifications.models import Notification
from apps.notifications.services import notifier
from apps.reservations.models import Avis, Reservation
from apps.reservations.serializers import AvisSerializer, ReservationSerializer
from apps.reservations.services import actualiser_statuts
from apps.signalements.models import Signalement
from apps.signalements.views import SignalementSerializer
from apps.users.compte import JustificatifSerializer
from apps.users.models import Justificatif
from apps.users.serializers import UserListSerializer

User = get_user_model()

ADMIN = [permissions.IsAuthenticated, EstAdministrateur]


class StatistiquesView(APIView):
    permission_classes = ADMIN

    def get(self, request):
        actualiser_statuts()
        utilisateurs = User.objects.filter(is_active=True)
        logements = Logement.objects.all()
        reservations = Reservation.objects.all()
        depuis = timezone.now() - timedelta(days=30)

        par_role = {
            l["role"]: l["total"]
            for l in utilisateurs.values("role").annotate(total=Count("id"))
        }
        par_statut = {
            l["statut"]: l["total"]
            for l in logements.values("statut").annotate(total=Count("id"))
        }
        resa_statut = {
            l["statut"]: l["total"]
            for l in reservations.values("statut").annotate(total=Count("id"))
        }
        inscriptions = [
            {"jour": l["jour"], "total": l["total"]}
            for l in utilisateurs.filter(date_joined__gte=depuis)
            .annotate(jour=TruncDate("date_joined"))
            .values("jour")
            .annotate(total=Count("id"))
            .order_by("jour")
        ]
        reservations_jour = [
            {"jour": l["jour"], "total": l["total"]}
            for l in reservations.filter(cree_le__gte=depuis)
            .annotate(jour=TruncDate("cree_le"))
            .values("jour")
            .annotate(total=Count("id"))
            .order_by("jour")
        ]
        villes = list(
            logements.filter(statut=Logement.Statut.PUBLIEE)
            .values("ville")
            .annotate(total=Count("id"))
            .order_by("-total")[:8]
        )
        volume = reservations.filter(
            statut__in=(
                Reservation.Statut.CONFIRMEE,
                Reservation.Statut.EN_COURS,
                Reservation.Statut.TERMINEE,
            )
        ).aggregate(total=Sum("montant_location"))["total"] or 0

        return Response(
            {
                "utilisateurs_total": utilisateurs.count(),
                "locataires": par_role.get("locataire", 0),
                "proprietaires": par_role.get("proprietaire", 0),
                "administrateurs": par_role.get("admin", 0),
                "logements_total": logements.count(),
                "logements_par_statut": par_statut,
                "annonces_publiees": par_statut.get(Logement.Statut.PUBLIEE, 0),
                "annonces_en_attente": par_statut.get(Logement.Statut.EN_ATTENTE, 0),
                "reservations_total": reservations.count(),
                "reservations_par_statut": resa_statut,
                "signalements_ouverts": Signalement.objects.filter(
                    statut__in=(Signalement.Statut.OUVERT, Signalement.Statut.EN_COURS)
                ).count(),
                "litiges": resa_statut.get(Reservation.Statut.EN_LITIGE, 0),
                "volume_reservations": volume,
                "inscriptions_30j": inscriptions,
                "reservations_30j": reservations_jour,
                "villes": villes,
            }
        )


# ------------------------------------------------------------------ Annonces


class AdminLogementSerializer(LogementDetailSerializer):
    """L'admin voit tout : coordonnées exactes et propriétaire complet."""

    proprietaire = serializers.SerializerMethodField()
    nombre_signalements = serializers.SerializerMethodField()

    class Meta(LogementDetailSerializer.Meta):
        fields = LogementDetailSerializer.Meta.fields + ("nombre_signalements",)

    def get_proprietaire(self, obj):
        user = obj.proprietaire
        return {
            "id": user.id,
            "nom_complet": user.get_full_name() or user.username,
            "email": user.email,
            "phone": user.phone,
            "verified": user.verified,
        }

    def _adresse_autorisee(self, obj):
        return True

    def get_nombre_signalements(self, obj):
        return obj.signalements.filter(
            statut__in=(Signalement.Statut.OUVERT, Signalement.Statut.EN_COURS)
        ).count()


class AdminLogementListView(generics.ListAPIView):
    permission_classes = ADMIN
    serializer_class = AdminLogementSerializer

    def get_queryset(self):
        params = self.request.query_params
        queryset = Logement.objects.all()
        if params.get("statut"):
            queryset = queryset.filter(statut__in=params["statut"].split(","))
        texte = (params.get("q") or "").strip()
        if texte:
            queryset = queryset.filter(
                Q(titre__icontains=texte)
                | Q(ville__icontains=texte)
                | Q(quartier__icontains=texte)
                | Q(proprietaire__email__icontains=texte)
                | Q(proprietaire__last_name__icontains=texte)
            )
        if params.get("geolocalises"):
            queryset = queryset.filter(latitude__isnull=False)
        return annoter(queryset).prefetch_related("equipements", "panoramas", "videos").order_by(
            "-modifie_le"
        )


class AdminLogementDetailView(generics.RetrieveAPIView):
    permission_classes = ADMIN
    serializer_class = AdminLogementSerializer

    def get_queryset(self):
        return annoter(Logement.objects.all()).prefetch_related("equipements", "panoramas", "videos")


class ModererLogementView(APIView):
    """valider · refuser · suspendre · reactiver · verifier · retirer_verification"""

    permission_classes = ADMIN

    def post(self, request, pk):
        logement = get_object_or_404(Logement, pk=pk)
        action = request.data.get("action")
        motif = str(request.data.get("motif", "")).strip()
        proprietaire = logement.proprietaire

        if action == "valider":
            if logement.statut not in (
                Logement.Statut.EN_ATTENTE,
                Logement.Statut.REFUSEE,
                Logement.Statut.SUSPENDUE,
            ):
                raise ValidationError("Seule une annonce en attente peut être validée.")
            premiere_publication = logement.publie_le is None
            logement.statut = Logement.Statut.PUBLIEE
            logement.motif_refus = ""
            logement.publie_le = logement.publie_le or timezone.now()
            logement.save()
            notifier(
                proprietaire,
                Notification.Type.ANNONCE_VALIDEE,
                "Annonce publiée ✅",
                f"« {logement.titre} » est maintenant visible par les locataires.",
                logement=logement.pk,
            )
            if premiere_publication:
                notifier_alertes(logement)

        elif action == "refuser":
            if not motif:
                raise ValidationError({"motif": "Indiquez le motif du refus."})
            logement.statut = Logement.Statut.REFUSEE
            logement.motif_refus = motif
            logement.save()
            notifier(
                proprietaire,
                Notification.Type.ANNONCE_REFUSEE,
                "Annonce refusée",
                f"« {logement.titre} » a été refusée : {motif}",
                logement=logement.pk,
            )

        elif action == "suspendre":
            logement.statut = Logement.Statut.SUSPENDUE
            logement.motif_refus = motif
            logement.save()
            notifier(
                proprietaire,
                Notification.Type.ANNONCE_SUSPENDUE,
                "Annonce suspendue",
                f"« {logement.titre} » a été suspendue par l'administration."
                + (f" Motif : {motif}" if motif else ""),
                logement=logement.pk,
            )

        elif action == "reactiver":
            if logement.statut != Logement.Statut.SUSPENDUE:
                raise ValidationError("L'annonce n'est pas suspendue.")
            logement.statut = Logement.Statut.PUBLIEE
            logement.motif_refus = ""
            logement.publie_le = logement.publie_le or timezone.now()
            logement.save()
            notifier(
                proprietaire,
                Notification.Type.ANNONCE_VALIDEE,
                "Annonce réactivée",
                f"« {logement.titre} » est de nouveau visible.",
                logement=logement.pk,
            )

        elif action in ("verifier", "retirer_verification"):
            logement.verifie = action == "verifier"
            logement.save(update_fields=["verifie"])
        else:
            raise ValidationError("Action inconnue.")

        logement = annoter(Logement.objects.filter(pk=logement.pk)).get()
        return Response(
            AdminLogementSerializer(logement, context={"request": request}).data
        )


# -------------------------------------------------------------- Réservations


class AdminReservationListView(generics.ListAPIView):
    permission_classes = ADMIN
    serializer_class = ReservationSerializer

    def get_queryset(self):
        actualiser_statuts()
        params = self.request.query_params
        queryset = Reservation.objects.select_related(
            "logement", "logement__proprietaire", "locataire", "avis"
        ).prefetch_related("logement__photos")
        if params.get("statut"):
            queryset = queryset.filter(statut__in=params["statut"].split(","))
        texte = (params.get("q") or "").strip()
        if texte:
            queryset = queryset.filter(
                Q(logement__titre__icontains=texte)
                | Q(locataire__email__icontains=texte)
                | Q(locataire__last_name__icontains=texte)
                | Q(logement__ville__icontains=texte)
            )
        return queryset


class AdminReservationStatutView(APIView):
    permission_classes = ADMIN

    AUTORISES = (
        Reservation.Statut.CONFIRMEE,
        Reservation.Statut.ANNULEE,
        Reservation.Statut.TERMINEE,
        Reservation.Statut.EN_LITIGE,
    )

    def patch(self, request, pk):
        reservation = get_object_or_404(Reservation, pk=pk)
        statut = request.data.get("statut")
        if statut not in self.AUTORISES:
            raise ValidationError("Statut non autorisé.")
        if statut == Reservation.Statut.CONFIRMEE and reservation.chevauchements().exists():
            raise ValidationError("Une autre réservation occupe déjà cette période.")
        reservation.statut = statut
        reservation.motif = str(request.data.get("motif", reservation.motif))
        reservation.save(update_fields=["statut", "motif", "modifie_le"])
        for destinataire in (reservation.locataire, reservation.logement.proprietaire):
            notifier(
                destinataire,
                Notification.Type.SYSTEME,
                "Réservation mise à jour par l'administration",
                f"La réservation #{reservation.pk} est maintenant : "
                f"{reservation.get_statut_display()}.",
                reservation=reservation.pk,
            )
        return Response(
            ReservationSerializer(reservation, context={"request": request}).data
        )


# ------------------------------------------------------------- Signalements


class AdminSignalementSerializer(SignalementSerializer):
    auteur = UtilisateurPublicSerializer(read_only=True)
    resume_cible = serializers.SerializerMethodField()

    class Meta(SignalementSerializer.Meta):
        fields = SignalementSerializer.Meta.fields + ("auteur", "resume_cible")

    def get_resume_cible(self, obj):
        if obj.logement_id:
            return f"Annonce « {obj.logement.titre} »"
        if obj.utilisateur_id:
            return f"Utilisateur {obj.utilisateur.get_full_name() or obj.utilisateur.email}"
        if obj.reservation_id:
            return f"Réservation #{obj.reservation_id}"
        if obj.avis_id:
            return f"Avis #{obj.avis_id}"
        if obj.conversation_id:
            return f"Conversation #{obj.conversation_id}"
        return "Demande d'assistance"


class AdminSignalementListView(generics.ListAPIView):
    permission_classes = ADMIN
    serializer_class = AdminSignalementSerializer

    def get_queryset(self):
        queryset = Signalement.objects.select_related(
            "auteur", "logement", "utilisateur"
        )
        statut = self.request.query_params.get("statut")
        if statut:
            queryset = queryset.filter(statut__in=statut.split(","))
        return queryset


class AdminSignalementDetailView(APIView):
    permission_classes = ADMIN

    def patch(self, request, pk):
        signalement = get_object_or_404(Signalement, pk=pk)
        statut = request.data.get("statut", signalement.statut)
        if statut not in Signalement.Statut.values:
            raise ValidationError("Statut inconnu.")
        signalement.statut = statut
        signalement.decision = str(request.data.get("decision", signalement.decision))
        signalement.traite_par = request.user
        signalement.save()
        if statut in (Signalement.Statut.RESOLU, Signalement.Statut.REJETE):
            notifier(
                signalement.auteur,
                Notification.Type.SIGNALEMENT,
                "Votre signalement a été traité",
                signalement.decision or signalement.get_statut_display(),
            )
        return Response(
            AdminSignalementSerializer(signalement, context={"request": request}).data
        )


# --------------------------------------------------------------------- Avis


class AdminAvisListView(generics.ListAPIView):
    permission_classes = ADMIN
    serializer_class = AvisSerializer

    def get_queryset(self):
        return Avis.objects.select_related("auteur").all()


class AdminAvisDetailView(APIView):
    permission_classes = ADMIN

    def patch(self, request, pk):
        avis = get_object_or_404(Avis, pk=pk)
        avis.masque = bool(request.data.get("masque", avis.masque))
        avis.save(update_fields=["masque"])
        return Response(AvisSerializer(avis).data)


# --------------------------------------------------------------- Équipements


class AdminEquipementListView(generics.ListCreateAPIView):
    permission_classes = ADMIN
    serializer_class = EquipementSerializer
    queryset = Equipement.objects.all()


class AdminEquipementDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = ADMIN
    serializer_class = EquipementSerializer
    queryset = Equipement.objects.all()


# -------------------------------------------------------------- Utilisateurs


class AdminUtilisateurView(APIView):
    """Active / désactive un compte ou change son statut vérifié."""

    permission_classes = ADMIN

    def patch(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        if user.pk == request.user.pk and request.data.get("is_active") is False:
            raise ValidationError("Vous ne pouvez pas désactiver votre propre compte.")
        modifies = []
        for champ in ("is_active", "verified"):
            if champ in request.data:
                setattr(user, champ, bool(request.data[champ]))
                modifies.append(champ)
        if modifies:
            user.save(update_fields=modifies)
        return Response(UserListSerializer(user).data)


# ------------------------------------------------------------ Justificatifs


class AdminJustificatifSerializer(JustificatifSerializer):
    utilisateur = serializers.SerializerMethodField()

    class Meta(JustificatifSerializer.Meta):
        fields = JustificatifSerializer.Meta.fields + ("utilisateur",)

    def get_utilisateur(self, obj):
        u = obj.user
        return {
            "id": u.id,
            "nom_complet": u.get_full_name() or u.username,
            "email": u.email,
            "phone": u.phone,
            "role": u.role,
            "verified": u.verified,
        }


class AdminJustificatifListView(generics.ListAPIView):
    permission_classes = ADMIN
    serializer_class = AdminJustificatifSerializer

    def get_queryset(self):
        queryset = Justificatif.objects.select_related("user")
        statut = self.request.query_params.get("statut")
        if statut:
            queryset = queryset.filter(statut=statut)
        return queryset


class AdminJustificatifView(APIView):
    """PATCH {statut: accepte|refuse, motif}. Accepter vérifie le compte."""

    permission_classes = ADMIN

    def patch(self, request, pk):
        justificatif = get_object_or_404(Justificatif.objects.select_related("user"), pk=pk)
        statut = request.data.get("statut")
        if statut not in (Justificatif.Statut.ACCEPTE, Justificatif.Statut.REFUSE):
            raise ValidationError("Statut attendu : accepte ou refuse.")
        motif = str(request.data.get("motif", "")).strip()
        if statut == Justificatif.Statut.REFUSE and not motif:
            raise ValidationError({"motif": "Expliquez le refus au propriétaire."})
        justificatif.statut = statut
        justificatif.motif = motif
        justificatif.traite_le = timezone.now()
        justificatif.save(update_fields=["statut", "motif", "traite_le"])
        user = justificatif.user
        if statut == Justificatif.Statut.ACCEPTE and not user.verified:
            user.verified = True
            user.save(update_fields=["verified"])
        notifier(
            user,
            Notification.Type.SYSTEME,
            "Compte vérifié ✅" if statut == Justificatif.Statut.ACCEPTE else "Document refusé",
            "Votre identité a été vérifiée : le badge apparaît sur vos annonces."
            if statut == Justificatif.Statut.ACCEPTE
            else f"« {justificatif.get_type_display()} » a été refusé : {motif}",
        )
        return Response(AdminJustificatifSerializer(justificatif).data)


class AdminJustificatifFichierView(APIView):
    """Le document n'est jamais exposé publiquement : téléchargement authentifié."""

    permission_classes = ADMIN

    def get(self, request, pk):
        justificatif = get_object_or_404(Justificatif, pk=pk)
        return FileResponse(justificatif.fichier.open("rb"))
