from django.urls import path

from . import views

urlpatterns = [
    path("reservations/", views.MesReservationsView.as_view(), name="reservations"),
    path(
        "reservations/estimer/",
        views.EstimationView.as_view(),
        name="reservation-estimer",
    ),
    path(
        "reservations/recues/",
        views.ReservationsRecuesView.as_view(),
        name="reservations-recues",
    ),
    path(
        "reservations/<int:pk>/",
        views.ReservationDetailView.as_view(),
        name="reservation",
    ),
    path(
        "reservations/<int:pk>/avis/",
        views.AvisCreationView.as_view(),
        name="reservation-avis",
    ),
    path(
        "reservations/<int:pk>/<str:action>/",
        views.ReservationActionView.as_view(),
        name="reservation-action",
    ),
    path("logements/<int:pk>/avis/", views.AvisLogementView.as_view(), name="logement-avis"),
    path("avis/recus/", views.AvisRecusView.as_view(), name="avis-recus"),
    path("avis/<int:pk>/repondre/", views.AvisReponseView.as_view(), name="avis-repondre"),
]
