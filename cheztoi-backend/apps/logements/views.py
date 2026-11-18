from django.db.models import Count, F, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, parsers, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import EstProprietaire, est_admin

from .models import Equipement, Favori, Logement, Panorama, Photo, RechercheEnregistree
from .serializers import (
    EquipementSerializer,
    LogementDetailSerializer,
    LogementEcritureSerializer,
    LogementResumeSerializer,
    PanoramaSerializer,
    PhotoSerializer,
    RechercheEnregistreeSerializer,
)
from .services import annoter, filtrer, logements_publics, trier


class Pagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "taille"
    max_page_size = 100


# --------------------------------------------------------------------------
# Côté locataire / public
# --------------------------------------------------------------------------


class EquipementListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = EquipementSerializer
    queryset = Equipement.objects.filter(actif=True)


class LogementRechercheView(generics.ListAPIView):
    """Recherche avancée paginée : voir services.filtrer pour les paramètres."""

    permission_classes = [permissions.AllowAny]
    serializer_class = LogementResumeSerializer
    pagination_class = Pagination

    def get_queryset(self):
        params = self.request.query_params
        queryset = filtrer(logements_publics(), params)
        queryset = annoter(queryset, self.request.user)
        return trier(queryset, params.get("tri", "recent"))


class LogementCarteView(generics.ListAPIView):
    """Marqueurs de la carte : tous les résultats géolocalisés (max 300)."""

    permission_classes = [permissions.AllowAny]
    serializer_class = LogementResumeSerializer

    def get_queryset(self):
        params = self.request.query_params
        queryset = filtrer(
            logements_publics().filter(latitude__isnull=False), params
        )
        queryset = annoter(queryset, self.request.user)
        return trier(queryset, params.get("tri", "recent"))[:300]


class LogementDetailView(generics.RetrieveAPIView):
    """Fiche d'un logement publié (ou de son propriétaire / d'un admin)."""

    permission_classes = [permissions.AllowAny]
    serializer_class = LogementDetailSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Logement.objects.all()
        if not est_admin(user):
            visible = Q(statut__in=(Logement.Statut.PUBLIEE, Logement.Statut.LOUEE))
            if user.is_authenticated:
                visible |= Q(proprietaire=user)
            queryset = queryset.filter(visible)
        return annoter(queryset, user).prefetch_related("equipements", "panoramas")

    def retrieve(self, request, *args, **kwargs):
        logement = self.get_object()
        if request.user.id != logement.proprietaire_id:
            Logement.objects.filter(pk=logement.pk).update(
                nombre_vues=F("nombre_vues") + 1
            )
        return Response(self.get_serializer(logement).data)


class LogementSimilairesView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = LogementResumeSerializer

    def get_queryset(self):
        logement = get_object_or_404(Logement, pk=self.kwargs["pk"])
        marge = max(logement.prix // 3, 1)
        queryset = (
            logements_publics()
            .exclude(pk=logement.pk)
            .filter(
                Q(type_logement=logement.type_logement) | Q(ville__iexact=logement.ville),
                prix__gte=logement.prix - marge,
                prix__lte=logement.prix + marge,
            )
        )
        return annoter(queryset, self.request.user).order_by("-publie_le")[:10]


class LogementIndisponibilitesView(APIView):
    """Périodes déjà réservées, pour griser le calendrier."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        from apps.reservations.models import Reservation

        logement = get_object_or_404(Logement, pk=pk)
        periodes = Reservation.objects.filter(
            logement=logement,
            statut__in=Reservation.BLOQUANTS,
            date_fin__gte=timezone.localdate(),
        ).values("date_debut", "date_fin")
        return Response(list(periodes))


class AccueilView(APIView):
    """Toutes les sections de la page d'accueil en un seul appel."""

    permission_classes = [permissions.AllowAny]

    def _liste(self, queryset, limite=10):
        user = self.request.user
        return LogementResumeSerializer(
            annoter(queryset, user)[:limite],
            many=True,
            context={"request": self.request},
        ).data

    def get(self, request):
        publics = logements_publics()
        user = request.user

        recommandes = publics
        if user.is_authenticated:
            # Recommandations : villes et budgets des favoris et des alertes.
            villes = set(
                Favori.objects.filter(utilisateur=user).values_list(
                    "logement__ville", flat=True
                )
            )
            if user.city:
                villes.add(user.city)
            budgets = [
                f.logement.prix
                for f in Favori.objects.filter(utilisateur=user).select_related("logement")
            ]
            for recherche in RechercheEnregistree.objects.filter(utilisateur=user):
                if recherche.criteres.get("ville"):
                    villes.add(recherche.criteres["ville"])
            filtre = Q()
            for ville in villes:
                filtre |= Q(ville__iexact=ville)
            if villes:
                recommandes = recommandes.filter(filtre)
            if budgets:
                plafond = int(max(budgets) * 1.3)
                recommandes = recommandes.filter(prix__lte=plafond)
            recommandes = recommandes.exclude(favoris__utilisateur=user)

        villes_populaires = (
            publics.values("ville")
            .annotate(total=Count("id"))
            .order_by("-total")[:8]
        )
        types = publics.values("type_logement").annotate(total=Count("id"))

        return Response(
            {
                "recents": self._liste(publics.order_by("-publie_le")),
                "populaires": self._liste(publics.order_by("-nombre_vues")),
                "recommandes": self._liste(recommandes.order_by("-publie_le")),
                "verifies": self._liste(
                    publics.filter(verifie=True).order_by("-publie_le")
                ),
                "visites_virtuelles": self._liste(
                    publics.filter(panoramas__isnull=False)
                    .distinct()
                    .order_by("-publie_le")
                ),
                "villes": list(villes_populaires),
                "types": {t["type_logement"]: t["total"] for t in types},
                "total": publics.count(),
            }
        )


class SuggestionsView(APIView):
    """Suggestions de localisation pour la barre de recherche."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        texte = (request.query_params.get("q") or "").strip()
        publics = logements_publics()
        suggestions = []
        vus = set()
        for champ in ("ville", "commune", "quartier"):
            valeurs = publics
            if texte:
                valeurs = valeurs.filter(**{f"{champ}__icontains": texte})
            for ligne in (
                valeurs.exclude(**{champ: ""})
                .values(champ)
                .annotate(total=Count("id"))
                .order_by("-total")[:5]
            ):
                libelle = ligne[champ]
                if libelle.lower() in vus:
                    continue
                vus.add(libelle.lower())
                suggestions.append(
                    {"type": champ, "libelle": libelle, "total": ligne["total"]}
                )
        return Response(suggestions[:10])


class ComparerView(APIView):
    """Comparaison de 2 à 4 logements : ?ids=1,2,3"""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        ids = [
            int(i)
            for i in (request.query_params.get("ids") or "").split(",")
            if i.strip().isdigit()
        ][:4]
        queryset = annoter(
            logements_publics().filter(pk__in=ids), request.user
        ).prefetch_related("equipements")
        return Response(
            LogementDetailSerializer(
                queryset, many=True, context={"request": request}
            ).data
        )


class FavoriListView(generics.ListAPIView):
    serializer_class = LogementResumeSerializer

    def get_queryset(self):
        queryset = Logement.objects.filter(favoris__utilisateur=self.request.user)
        return annoter(queryset, self.request.user).order_by("-favoris__cree_le")


class FavoriBasculeView(APIView):
    """POST : ajoute aux favoris, DELETE : retire."""

    def post(self, request, pk):
        logement = get_object_or_404(logements_publics(), pk=pk)
        Favori.objects.get_or_create(utilisateur=request.user, logement=logement)
        return Response({"est_favori": True}, status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        Favori.objects.filter(utilisateur=request.user, logement_id=pk).delete()
        return Response({"est_favori": False})


class RechercheListView(generics.ListCreateAPIView):
    serializer_class = RechercheEnregistreeSerializer

    def get_queryset(self):
        return RechercheEnregistree.objects.filter(utilisateur=self.request.user)

    def perform_create(self, serializer):
        serializer.save(utilisateur=self.request.user)


class RechercheDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RechercheEnregistreeSerializer

    def get_queryset(self):
        return RechercheEnregistree.objects.filter(utilisateur=self.request.user)


# --------------------------------------------------------------------------
# Espace propriétaire
# --------------------------------------------------------------------------


def logement_du_proprietaire(request, pk):
    return get_object_or_404(Logement, pk=pk, proprietaire=request.user)


class MesLogementsView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, EstProprietaire]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return LogementEcritureSerializer
        return LogementResumeSerializer

    def get_queryset(self):
        queryset = Logement.objects.filter(proprietaire=self.request.user)
        statut = self.request.query_params.get("statut")
        if statut:
            queryset = queryset.filter(statut=statut)
        return annoter(queryset, self.request.user).order_by("-modifie_le")

    def create(self, request, *args, **kwargs):
        serializer = LogementEcritureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        logement = serializer.save(proprietaire=request.user)
        return Response(
            LogementDetailSerializer(logement, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class MonLogementView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, EstProprietaire]

    def get_queryset(self):
        return annoter(
            Logement.objects.filter(proprietaire=self.request.user), self.request.user
        ).prefetch_related("equipements", "panoramas")

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return LogementEcritureSerializer
        return LogementDetailSerializer

    def update(self, request, *args, **kwargs):
        logement = self.get_object()
        if logement.statut == Logement.Statut.SUSPENDUE:
            raise ValidationError(
                "Cette annonce est suspendue par l'administration et ne peut pas être modifiée."
            )
        serializer = LogementEcritureSerializer(
            logement, data=request.data, partial=kwargs.get("partial", False)
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        logement = self.get_queryset().get(pk=logement.pk)
        return Response(
            LogementDetailSerializer(logement, context={"request": request}).data
        )

    def destroy(self, request, *args, **kwargs):
        logement = self.get_object()
        from apps.reservations.models import Reservation

        if logement.reservations.filter(statut__in=Reservation.BLOQUANTS).exists():
            raise ValidationError(
                "Ce logement a des réservations en cours : archivez-le plutôt."
            )
        logement.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangerStatutView(APIView):
    """Actions du propriétaire : soumettre, archiver, marquer loué, republier."""

    permission_classes = [permissions.IsAuthenticated, EstProprietaire]

    TRANSITIONS = {
        "soumettre": (
            (Logement.Statut.BROUILLON, Logement.Statut.REFUSEE, Logement.Statut.ARCHIVEE),
            Logement.Statut.EN_ATTENTE,
        ),
        "brouillon": ((Logement.Statut.EN_ATTENTE,), Logement.Statut.BROUILLON),
        "archiver": (
            (
                Logement.Statut.BROUILLON,
                Logement.Statut.PUBLIEE,
                Logement.Statut.LOUEE,
                Logement.Statut.REFUSEE,
                Logement.Statut.EN_ATTENTE,
            ),
            Logement.Statut.ARCHIVEE,
        ),
        "louee": ((Logement.Statut.PUBLIEE,), Logement.Statut.LOUEE),
        "republier": ((Logement.Statut.LOUEE,), Logement.Statut.PUBLIEE),
    }

    def post(self, request, pk, action):
        logement = logement_du_proprietaire(request, pk)
        if action not in self.TRANSITIONS:
            raise ValidationError("Action inconnue.")
        depuis, vers = self.TRANSITIONS[action]
        if logement.statut not in depuis:
            raise ValidationError(
                f"Impossible depuis le statut « {logement.get_statut_display()} »."
            )
        if action == "soumettre" and not logement.photos.exists():
            raise ValidationError("Ajoutez au moins une photo avant de soumettre l'annonce.")
        logement.statut = vers
        if action == "soumettre":
            logement.motif_refus = ""
        logement.save(update_fields=["statut", "motif_refus", "modifie_le"])
        logement = annoter(Logement.objects.filter(pk=logement.pk), request.user).get()
        return Response(
            LogementDetailSerializer(logement, context={"request": request}).data
        )


class PhotoUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated, EstProprietaire]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def post(self, request, pk):
        logement = logement_du_proprietaire(request, pk)
        if logement.photos.count() >= 20:
            raise ValidationError("20 photos maximum par annonce.")
        serializer = PhotoSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        premiere = not logement.photos.exists()
        photo = serializer.save(
            logement=logement,
            ordre=logement.photos.count(),
            principale=premiere or serializer.validated_data.get("principale", False),
        )
        if photo.principale:
            logement.photos.exclude(pk=photo.pk).update(principale=False)
        return Response(
            PhotoSerializer(photo, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class PhotoDetailView(APIView):
    """PATCH : légende, ordre ou photo principale. DELETE : suppression."""

    permission_classes = [permissions.IsAuthenticated, EstProprietaire]

    def _photo(self, request, pk, photo_id):
        logement = logement_du_proprietaire(request, pk)
        return get_object_or_404(Photo, pk=photo_id, logement=logement)

    def patch(self, request, pk, photo_id):
        photo = self._photo(request, pk, photo_id)
        if "legende" in request.data:
            photo.legende = str(request.data["legende"])[:150]
        if "ordre" in request.data:
            try:
                photo.ordre = max(int(request.data["ordre"]), 0)
            except (TypeError, ValueError):
                raise ValidationError({"ordre": "Nombre attendu."}) from None
        if str(request.data.get("principale", "")).lower() in ("true", "1"):
            photo.logement.photos.exclude(pk=photo.pk).update(principale=False)
            photo.principale = True
        photo.save()
        return Response(PhotoSerializer(photo, context={"request": request}).data)

    def delete(self, request, pk, photo_id):
        photo = self._photo(request, pk, photo_id)
        logement = photo.logement
        etait_principale = photo.principale
        photo.image.delete(save=False)
        photo.delete()
        if etait_principale:
            suivante = logement.photos.order_by("ordre", "id").first()
            if suivante:
                suivante.principale = True
                suivante.save(update_fields=["principale"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class PanoramaUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated, EstProprietaire]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def post(self, request, pk):
        logement = logement_du_proprietaire(request, pk)
        serializer = PanoramaSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        panorama = serializer.save(logement=logement, ordre=logement.panoramas.count())
        return Response(
            PanoramaSerializer(panorama, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class PanoramaDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, EstProprietaire]

    def delete(self, request, pk, panorama_id):
        logement = logement_du_proprietaire(request, pk)
        panorama = get_object_or_404(Panorama, pk=panorama_id, logement=logement)
        panorama.image.delete(save=False)
        panorama.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StatistiquesProprietaireView(APIView):
    """Tableau de bord du propriétaire."""

    permission_classes = [permissions.IsAuthenticated, EstProprietaire]

    def get(self, request):
        from apps.reservations.models import Avis, Reservation

        logements = Logement.objects.filter(proprietaire=request.user)
        reservations = Reservation.objects.filter(logement__proprietaire=request.user)
        par_statut = {
            ligne["statut"]: ligne["total"]
            for ligne in logements.values("statut").annotate(total=Count("id"))
        }
        resa_par_statut = {
            ligne["statut"]: ligne["total"]
            for ligne in reservations.values("statut").annotate(total=Count("id"))
        }
        revenus = reservations.filter(
            statut__in=(
                Reservation.Statut.CONFIRMEE,
                Reservation.Statut.EN_COURS,
                Reservation.Statut.TERMINEE,
            )
        ).aggregate(total=Sum("montant_location"))["total"] or 0
        avis = Avis.objects.filter(logement__proprietaire=request.user, masque=False)
        note = avis.aggregate(note=Sum("note_globale"), total=Count("id"))
        top = (
            logements.annotate(nb_favoris=Count("favoris", distinct=True))
            .order_by("-nombre_vues")[:5]
            .values("id", "titre", "nombre_vues", "nb_favoris", "statut")
        )
        return Response(
            {
                "logements_total": logements.count(),
                "logements_par_statut": par_statut,
                "vues_total": logements.aggregate(t=Sum("nombre_vues"))["t"] or 0,
                "favoris_total": Favori.objects.filter(
                    logement__proprietaire=request.user
                ).count(),
                "reservations_total": reservations.count(),
                "reservations_par_statut": resa_par_statut,
                "demandes_en_attente": resa_par_statut.get(
                    Reservation.Statut.EN_ATTENTE, 0
                ),
                "revenus": revenus,
                "note_moyenne": (
                    round(note["note"] / note["total"], 1) if note["total"] else None
                ),
                "nombre_avis": note["total"],
                "top_logements": list(top),
            }
        )
