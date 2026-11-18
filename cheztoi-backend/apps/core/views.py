from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """Endpoint public pour vérifier que l'API répond."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok", "service": "cheztoi-backend"})
