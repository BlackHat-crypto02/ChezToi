from django.utils import timezone
from rest_framework import serializers

from apps.core.serializers import UtilisateurPublicSerializer
from apps.logements.models import Logement
from apps.logements.serializers import LogementResumeSerializer

from .models import Avis, Reservation


class AvisSerializer(serializers.ModelSerializer):
    auteur = UtilisateurPublicSerializer(read_only=True)

    class Meta:
        model = Avis
        fields = (
            "id",
            "reservation",
            "logement",
            "auteur",
            "note_etat",
            "note_conformite",
            "note_proprete",
            "note_communication",
            "note_qualite_prix",
            "note_globale",
            "commentaire",
            "reponse_proprietaire",
            "masque",
            "cree_le",
        )
        read_only_fields = (
            "id",
            "reservation",
            "logement",
            "auteur",
            "note_globale",
            "reponse_proprietaire",
            "masque",
            "cree_le",
        )


class ReservationSerializer(serializers.ModelSerializer):
    logement = LogementResumeSerializer(read_only=True)
    locataire = UtilisateurPublicSerializer(read_only=True)
    proprietaire = serializers.SerializerMethodField()
    telephone_contact = serializers.SerializerMethodField()
    a_avis = serializers.SerializerMethodField()
    peut_evaluer = serializers.SerializerMethodField()
    peut_annuler = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = (
            "id",
            "logement",
            "locataire",
            "proprietaire",
            "telephone_contact",
            "date_debut",
            "date_fin",
            "nombre_personnes",
            "message",
            "periodes",
            "montant_location",
            "caution",
            "avance",
            "frais",
            "montant_total",
            "statut",
            "motif",
            "a_avis",
            "peut_evaluer",
            "peut_annuler",
            "cree_le",
            "modifie_le",
        )
        read_only_fields = fields

    def get_proprietaire(self, obj):
        return UtilisateurPublicSerializer(obj.logement.proprietaire).data

    def get_telephone_contact(self, obj):
        """Numéro de l'autre partie, une fois la réservation acceptée."""
        if obj.statut not in Reservation.BLOQUANTS + (Reservation.Statut.TERMINEE,):
            return ""
        request = self.context.get("request")
        if request is None:
            return ""
        if request.user.id == obj.locataire_id:
            return obj.logement.proprietaire.phone
        return obj.locataire.phone

    def get_a_avis(self, obj):
        return hasattr(obj, "avis")

    def get_peut_evaluer(self, obj):
        request = self.context.get("request")
        return bool(
            request
            and request.user.id == obj.locataire_id
            and obj.statut == Reservation.Statut.TERMINEE
            and not hasattr(obj, "avis")
        )

    def get_peut_annuler(self, obj):
        return obj.statut in (
            Reservation.Statut.EN_ATTENTE,
            Reservation.Statut.ACCEPTEE,
            Reservation.Statut.CONFIRMEE,
        )


class ReservationCreationSerializer(serializers.Serializer):
    logement = serializers.PrimaryKeyRelatedField(
        queryset=Logement.objects.filter(statut=Logement.Statut.PUBLIEE)
    )
    date_debut = serializers.DateField()
    date_fin = serializers.DateField()
    nombre_personnes = serializers.IntegerField(min_value=1, default=1)
    message = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        logement = attrs["logement"]
        debut, fin = attrs["date_debut"], attrs["date_fin"]
        request = self.context.get("request")

        if debut < timezone.localdate():
            raise serializers.ValidationError(
                {"date_debut": "La date d'arrivée est déjà passée."}
            )
        if fin <= debut:
            raise serializers.ValidationError(
                {"date_fin": "La date de départ doit suivre la date d'arrivée."}
            )
        if request and logement.proprietaire_id == request.user.id:
            raise serializers.ValidationError(
                "Vous ne pouvez pas réserver votre propre logement."
            )
        if logement.capacite and attrs["nombre_personnes"] > logement.capacite:
            raise serializers.ValidationError(
                {
                    "nombre_personnes": (
                        f"Ce logement accueille {logement.capacite} personne(s) au maximum."
                    )
                }
            )

        brouillon = Reservation(logement=logement, date_debut=debut, date_fin=fin)
        if brouillon.chevauchements().exists():
            raise serializers.ValidationError(
                "Le logement est déjà réservé sur une partie de cette période."
            )
        return attrs
