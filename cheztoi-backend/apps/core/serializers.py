from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class UtilisateurPublicSerializer(serializers.ModelSerializer):
    """Ce qu'un autre utilisateur peut voir d'un compte (sans contact privé)."""

    nom_complet = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "first_name",
            "last_name",
            "nom_complet",
            "role",
            "city",
            "verified",
            "date_joined",
        )
        read_only_fields = fields

    def get_nom_complet(self, obj):
        return obj.get_full_name() or obj.username
