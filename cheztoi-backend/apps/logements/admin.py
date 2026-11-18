from django.contrib import admin

from .models import Equipement, Favori, Logement, Panorama, Photo, RechercheEnregistree


class PhotoInline(admin.TabularInline):
    model = Photo
    extra = 0


class PanoramaInline(admin.TabularInline):
    model = Panorama
    extra = 0


@admin.register(Logement)
class LogementAdmin(admin.ModelAdmin):
    list_display = ("titre", "ville", "type_logement", "prix", "statut", "verifie", "proprietaire")
    list_filter = ("statut", "type_logement", "verifie", "ville")
    search_fields = ("titre", "ville", "quartier", "proprietaire__email")
    filter_horizontal = ("equipements",)
    inlines = (PhotoInline, PanoramaInline)


admin.site.register(Equipement)
admin.site.register(Favori)
admin.site.register(RechercheEnregistree)
