from django.contrib import admin

from .models import Signalement


@admin.register(Signalement)
class SignalementAdmin(admin.ModelAdmin):
    list_display = ("id", "motif", "auteur", "statut", "cree_le")
    list_filter = ("statut", "motif")
