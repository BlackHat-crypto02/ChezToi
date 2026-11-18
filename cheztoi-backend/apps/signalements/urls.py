from django.urls import path

from .views import MesSignalementsView

urlpatterns = [
    path("", MesSignalementsView.as_view(), name="signalements"),
]
