from rest_framework import generics, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("id", "type", "titre", "message", "donnees", "lue", "cree_le")
        read_only_fields = fields


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(destinataire=self.request.user)[:100]


class NotificationNonLuesView(APIView):
    def get(self, request):
        total = Notification.objects.filter(
            destinataire=request.user, lue=False
        ).count()
        return Response({"non_lues": total})


class NotificationLireView(APIView):
    """POST sans id : tout marquer comme lu. Avec id : une seule."""

    def post(self, request, pk=None):
        notifications = Notification.objects.filter(destinataire=request.user)
        if pk is not None:
            notifications = notifications.filter(pk=pk)
        modifiees = notifications.filter(lue=False).update(lue=True)
        return Response({"modifiees": modifiees})
