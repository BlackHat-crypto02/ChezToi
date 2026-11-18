from django.urls import path

from . import views

urlpatterns = [
    path("equipements/", views.EquipementListView.as_view(), name="equipements"),
    path("logements/", views.LogementRechercheView.as_view(), name="logements"),
    path("logements/carte/", views.LogementCarteView.as_view(), name="logements-carte"),
    path("logements/accueil/", views.AccueilView.as_view(), name="accueil"),
    path("logements/suggestions/", views.SuggestionsView.as_view(), name="suggestions"),
    path("logements/comparer/", views.ComparerView.as_view(), name="comparer"),
    path("logements/<int:pk>/", views.LogementDetailView.as_view(), name="logement"),
    path(
        "logements/<int:pk>/similaires/",
        views.LogementSimilairesView.as_view(),
        name="logement-similaires",
    ),
    path(
        "logements/<int:pk>/indisponibilites/",
        views.LogementIndisponibilitesView.as_view(),
        name="logement-indisponibilites",
    ),
    path(
        "logements/<int:pk>/favori/",
        views.FavoriBasculeView.as_view(),
        name="logement-favori",
    ),
    path("favoris/", views.FavoriListView.as_view(), name="favoris"),
    path("recherches/", views.RechercheListView.as_view(), name="recherches"),
    path(
        "recherches/<int:pk>/",
        views.RechercheDetailView.as_view(),
        name="recherche",
    ),
    # Espace propriétaire
    path("mes-logements/", views.MesLogementsView.as_view(), name="mes-logements"),
    path(
        "mes-logements/statistiques/",
        views.StatistiquesProprietaireView.as_view(),
        name="statistiques-proprietaire",
    ),
    path("mes-logements/<int:pk>/", views.MonLogementView.as_view(), name="mon-logement"),
    path(
        "mes-logements/<int:pk>/photos/",
        views.PhotoUploadView.as_view(),
        name="mon-logement-photos",
    ),
    path(
        "mes-logements/<int:pk>/photos/<int:photo_id>/",
        views.PhotoDetailView.as_view(),
        name="mon-logement-photo",
    ),
    path(
        "mes-logements/<int:pk>/panoramas/",
        views.PanoramaUploadView.as_view(),
        name="mon-logement-panoramas",
    ),
    path(
        "mes-logements/<int:pk>/panoramas/<int:panorama_id>/",
        views.PanoramaDetailView.as_view(),
        name="mon-logement-panorama",
    ),
    path(
        "mes-logements/<int:pk>/<str:action>/",
        views.ChangerStatutView.as_view(),
        name="mon-logement-statut",
    ),
]
