from django.contrib import admin

from .models import Avis, Reservation


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ("id", "logement", "locataire", "date_debut", "date_fin", "statut", "montant_total")
    list_filter = ("statut",)


@admin.register(Avis)
class AvisAdmin(admin.ModelAdmin):
    list_display = ("logement", "auteur", "note_globale", "masque", "cree_le")
    list_filter = ("masque",)
