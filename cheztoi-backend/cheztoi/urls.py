"""Routes racines : back-office Django et API v1 partagée."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/auth/", include("apps.users.urls")),
    path("api/v1/", include("apps.logements.urls")),
    path("api/v1/", include("apps.reservations.urls")),
    path("api/v1/conversations/", include("apps.messagerie.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/signalements/", include("apps.signalements.urls")),
    path("api/v1/admin/", include("apps.administration.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
