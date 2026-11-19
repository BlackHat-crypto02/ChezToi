from rest_framework import generics, parsers, serializers

from .models import Signalement


class SignalementSerializer(serializers.ModelSerializer):
    cible = serializers.CharField(read_only=True)
    motif_libelle = serializers.CharField(source="get_motif_display", read_only=True)
    statut_libelle = serializers.CharField(source="get_statut_display", read_only=True)

    class Meta:
        model = Signalement
        fields = (
            "id",
            "motif",
            "motif_libelle",
            "description",
            "piece_jointe",
            "logement",
            "utilisateur",
            "reservation",
            "avis",
            "conversation",
            "cible",
            "statut",
            "statut_libelle",
            "decision",
            "cree_le",
            "modifie_le",
        )
        read_only_fields = ("id", "statut", "decision", "cree_le", "modifie_le")

    def validate(self, attrs):
        cibles = [
            attrs.get(c)
            for c in ("logement", "utilisateur", "reservation", "avis", "conversation")
        ]
        # Sans cible, seul « Autre » est accepté : c'est une demande d'assistance.
        if not any(cibles) and attrs.get("motif") != Signalement.Motif.AUTRE:
            raise serializers.ValidationError("Indiquez ce que vous signalez.")
        if not any(cibles) and not str(attrs.get("description", "")).strip():
            raise serializers.ValidationError(
                {"description": "Décrivez votre problème pour que l'équipe puisse vous aider."}
            )
        user = self.context["request"].user
        reservation = attrs.get("reservation")
        if reservation and user.id not in (
            reservation.locataire_id,
            reservation.logement.proprietaire_id,
        ):
            raise serializers.ValidationError("Réservation introuvable.")
        conversation = attrs.get("conversation")
        if conversation and user.id not in conversation.participants():
            raise serializers.ValidationError("Conversation introuvable.")
        if attrs.get("utilisateur") and attrs["utilisateur"].id == user.id:
            raise serializers.ValidationError("Vous ne pouvez pas vous signaler vous-même.")
        return attrs


class MesSignalementsView(generics.ListCreateAPIView):
    """Signalements et litiges de l'utilisateur connecté."""

    serializer_class = SignalementSerializer
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser]

    def get_queryset(self):
        return Signalement.objects.filter(auteur=self.request.user)

    def perform_create(self, serializer):
        signalement = serializer.save(auteur=self.request.user)
        reservation = signalement.reservation
        # Un problème de réservation ouvre un litige sur celle-ci.
        if reservation and reservation.statut in (
            "confirmee",
            "en_cours",
            "terminee",
        ):
            reservation.statut = "en_litige"
            reservation.save(update_fields=["statut", "modifie_le"])
