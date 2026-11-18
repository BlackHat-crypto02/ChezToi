"""Routes racines : back-office Django et API v1 partagée."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/auth/", include("apps.users.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
