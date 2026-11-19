from rest_framework import serializers

from apps.core.serializers import UtilisateurPublicSerializer

from .models import Equipement, Logement, Panorama, Photo, RechercheEnregistree, Video


def arrondir(valeur):
    """Position publique approximative (~100 m) pour protéger l'adresse."""
    return round(valeur, 3) if valeur is not None else None


class EquipementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipement
        fields = ("id", "nom", "icone", "actif")


class PhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Photo
        fields = ("id", "image", "legende", "ordre", "principale")
        read_only_fields = ("id",)


class PanoramaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Panorama
        fields = ("id", "image", "piece", "ordre")
        read_only_fields = ("id",)


class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = ("id", "fichier", "legende")
        read_only_fields = ("id",)

    def validate_fichier(self, fichier):
        if fichier.size > 50 * 1024 * 1024:
            raise serializers.ValidationError("Vidéo trop lourde (50 Mo maximum).")
        extension = fichier.name.rsplit(".", 1)[-1].lower() if "." in fichier.name else ""
        if extension not in ("mp4", "mov", "m4v", "webm", "3gp"):
            raise serializers.ValidationError("Formats acceptés : MP4, MOV, WEBM ou 3GP.")
        return fichier


class LogementResumeSerializer(serializers.ModelSerializer):
    """Carte d'annonce dans les listes (accueil, recherche, carte, favoris)."""

    photo = serializers.SerializerMethodField()
    note_moyenne = serializers.SerializerMethodField()
    nombre_avis = serializers.SerializerMethodField()
    est_favori = serializers.SerializerMethodField()
    a_visite_virtuelle = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    distance_km = serializers.SerializerMethodField()

    class Meta:
        model = Logement
        fields = (
            "id",
            "titre",
            "description",
            "type_logement",
            "meuble",
            "chambres",
            "salles_de_bain",
            "superficie",
            "prix",
            "devise",
            "periodicite",
            "pays",
            "region",
            "ville",
            "commune",
            "quartier",
            "latitude",
            "longitude",
            "photo",
            "verifie",
            "statut",
            "a_visite_virtuelle",
            "note_moyenne",
            "nombre_avis",
            "est_favori",
            "nombre_vues",
            "reservation_instantanee",
            "distance_km",
            "publie_le",
            "cree_le",
        )
        read_only_fields = fields

    def _est_proprietaire(self, obj):
        request = self.context.get("request")
        return bool(
            request
            and request.user.is_authenticated
            and request.user.id == obj.proprietaire_id
        )

    def get_photo(self, obj):
        photo = obj.photo_principale
        if photo is None:
            return None
        request = self.context.get("request")
        url = photo.image.url
        return request.build_absolute_uri(url) if request else url

    def get_note_moyenne(self, obj):
        note = getattr(obj, "note_moyenne", None)
        return round(note, 1) if note is not None else None

    def get_nombre_avis(self, obj):
        return getattr(obj, "nombre_avis", 0) or 0

    def get_est_favori(self, obj):
        return bool(getattr(obj, "est_favori", False))

    def get_a_visite_virtuelle(self, obj):
        valeur = getattr(obj, "a_visite_virtuelle", None)
        if valeur is None:
            return obj.panoramas.exists()
        return bool(valeur)

    def get_latitude(self, obj):
        return obj.latitude if self._est_proprietaire(obj) else arrondir(obj.latitude)

    def get_longitude(self, obj):
        return obj.longitude if self._est_proprietaire(obj) else arrondir(obj.longitude)

    def get_distance_km(self, obj):
        distance = getattr(obj, "distance_km", None)
        return round(distance, 1) if distance is not None else None


class LogementDetailSerializer(LogementResumeSerializer):
    """Fiche complète. L'adresse exacte n'est visible que des personnes autorisées."""

    equipements = EquipementSerializer(many=True, read_only=True)
    photos = PhotoSerializer(many=True, read_only=True)
    panoramas = PanoramaSerializer(many=True, read_only=True)
    videos = VideoSerializer(many=True, read_only=True)
    proprietaire = UtilisateurPublicSerializer(read_only=True)
    adresse = serializers.SerializerMethodField()
    adresse_visible = serializers.SerializerMethodField()
    telephone_proprietaire = serializers.SerializerMethodField()

    class Meta(LogementResumeSerializer.Meta):
        fields = LogementResumeSerializer.Meta.fields + (
            "salons",
            "toilettes",
            "etages_batiment",
            "etage",
            "capacite",
            "equipements",
            "caution",
            "avance",
            "frais_supplementaires",
            "charges",
            "conditions_paiement",
            "conditions_annulation",
            "adresse",
            "adresse_visible",
            "telephone_proprietaire",
            "photos",
            "panoramas",
            "videos",
            "proprietaire",
            "motif_refus",
            "modifie_le",
        )
        read_only_fields = fields

    def _adresse_autorisee(self, obj):
        if self._est_proprietaire(obj):
            return True
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if request.user.role == "admin":
            return True
        # Locataire avec une réservation acceptée ou confirmée.
        from apps.reservations.models import Reservation

        return Reservation.objects.filter(
            logement=obj,
            locataire=request.user,
            statut__in=(
                Reservation.Statut.ACCEPTEE,
                Reservation.Statut.CONFIRMEE,
                Reservation.Statut.EN_COURS,
                Reservation.Statut.TERMINEE,
            ),
        ).exists()

    def get_adresse_visible(self, obj):
        return self._adresse_autorisee(obj)

    def get_adresse(self, obj):
        return obj.adresse if self._adresse_autorisee(obj) else ""

    def get_telephone_proprietaire(self, obj):
        return obj.proprietaire.phone if self._adresse_autorisee(obj) else ""

    def get_latitude(self, obj):
        return obj.latitude if self._adresse_autorisee(obj) else arrondir(obj.latitude)

    def get_longitude(self, obj):
        return obj.longitude if self._adresse_autorisee(obj) else arrondir(obj.longitude)


class LogementEcritureSerializer(serializers.ModelSerializer):
    """Formulaire de publication / modification du propriétaire."""

    equipement_ids = serializers.PrimaryKeyRelatedField(
        source="equipements",
        queryset=Equipement.objects.filter(actif=True),
        many=True,
        required=False,
    )

    class Meta:
        model = Logement
        fields = (
            "titre",
            "description",
            "type_logement",
            "meuble",
            "chambres",
            "salons",
            "salles_de_bain",
            "toilettes",
            "superficie",
            "etages_batiment",
            "etage",
            "capacite",
            "equipement_ids",
            "prix",
            "devise",
            "periodicite",
            "caution",
            "avance",
            "frais_supplementaires",
            "charges",
            "conditions_paiement",
            "conditions_annulation",
            "reservation_instantanee",
            "pays",
            "region",
            "ville",
            "commune",
            "quartier",
            "adresse",
            "latitude",
            "longitude",
        )

    def validate_prix(self, value):
        if value <= 0:
            raise serializers.ValidationError("Le prix doit être supérieur à zéro.")
        return value

    def validate(self, attrs):
        lat = attrs.get("latitude", getattr(self.instance, "latitude", None))
        lng = attrs.get("longitude", getattr(self.instance, "longitude", None))
        if (lat is None) != (lng is None):
            raise serializers.ValidationError(
                "Renseignez la latitude et la longitude ensemble."
            )
        if lat is not None and not -90 <= lat <= 90:
            raise serializers.ValidationError({"latitude": "Latitude invalide."})
        if lng is not None and not -180 <= lng <= 180:
            raise serializers.ValidationError({"longitude": "Longitude invalide."})
        return attrs


class RechercheEnregistreeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RechercheEnregistree
        fields = ("id", "nom", "criteres", "alerte_active", "cree_le")
        read_only_fields = ("id", "cree_le")

    def validate_criteres(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Les critères doivent être un objet.")
        return {cle: valeur for cle, valeur in value.items() if valeur not in ("", None)}
