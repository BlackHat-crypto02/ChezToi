from django.urls import path

from . import views

urlpatterns = [
    path("statistiques/", views.StatistiquesView.as_view(), name="admin-stats"),
    path("logements/", views.AdminLogementListView.as_view(), name="admin-logements"),
    path(
        "logements/<int:pk>/",
        views.AdminLogementDetailView.as_view(),
        name="admin-logement",
    ),
    path(
        "logements/<int:pk>/moderer/",
        views.ModererLogementView.as_view(),
        name="admin-logement-moderer",
    ),
    path(
        "reservations/",
        views.AdminReservationListView.as_view(),
        name="admin-reservations",
    ),
    path(
        "reservations/<int:pk>/",
        views.AdminReservationStatutView.as_view(),
        name="admin-reservation",
    ),
    path(
        "signalements/",
        views.AdminSignalementListView.as_view(),
        name="admin-signalements",
    ),
    path(
        "signalements/<int:pk>/",
        views.AdminSignalementDetailView.as_view(),
        name="admin-signalement",
    ),
    path("avis/", views.AdminAvisListView.as_view(), name="admin-avis"),
    path("avis/<int:pk>/", views.AdminAvisDetailView.as_view(), name="admin-avis-detail"),
    path(
        "equipements/",
        views.AdminEquipementListView.as_view(),
        name="admin-equipements",
    ),
    path(
        "equipements/<int:pk>/",
        views.AdminEquipementDetailView.as_view(),
        name="admin-equipement",
    ),
    path(
        "justificatifs/",
        views.AdminJustificatifListView.as_view(),
        name="admin-justificatifs",
    ),
    path(
        "justificatifs/<int:pk>/",
        views.AdminJustificatifView.as_view(),
        name="admin-justificatif",
    ),
    path(
        "justificatifs/<int:pk>/fichier/",
        views.AdminJustificatifFichierView.as_view(),
        name="admin-justificatif-fichier",
    ),
    path(
        "utilisateurs/<int:pk>/",
        views.AdminUtilisateurView.as_view(),
        name="admin-utilisateur",
    ),
]
