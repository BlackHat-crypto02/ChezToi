"""Recherche, annotations et alertes partagées par les vues logements."""

import math

from django.db.models import (
    Avg,
    Count,
    Exists,
    ExpressionWrapper,
    F,
    FloatField,
    OuterRef,
    Q,
    Value,
)
from django.db.models.functions import Sqrt

from .models import Favori, Logement, Panorama, RechercheEnregistree

VRAI = ("1", "true", "vrai", "oui", "on")
FAUX = ("0", "false", "faux", "non", "off")


def _entier(valeur):
    try:
        return int(str(valeur).strip())
    except (TypeError, ValueError):
        return None


def _decimal(valeur):
    try:
        return float(str(valeur).strip())
    except (TypeError, ValueError):
        return None


def _liste(valeur):
    if valeur in (None, ""):
        return []
    if isinstance(valeur, (list, tuple)):
        return [str(v).strip() for v in valeur if str(v).strip()]
    return [v.strip() for v in str(valeur).split(",") if v.strip()]


def _booleen(valeur):
    texte = str(valeur).strip().lower()
    if texte in VRAI:
        return True
    if texte in FAUX:
        return False
    return None


def annoter(queryset, user=None):
    """Ajoute note moyenne, nombre d'avis, visite 360° et favori."""
    queryset = queryset.annotate(
        note_moyenne=Avg("avis__note_globale", filter=Q(avis__masque=False)),
        nombre_avis=Count("avis", filter=Q(avis__masque=False), distinct=True),
        a_visite_virtuelle=Exists(
            Panorama.objects.filter(logement=OuterRef("pk"))
        ),
    ).select_related("proprietaire").prefetch_related("photos")
    if user is not None and user.is_authenticated:
        queryset = queryset.annotate(
            est_favori=Exists(
                Favori.objects.filter(logement=OuterRef("pk"), utilisateur=user)
            )
        )
    return queryset


def logements_publics():
    return Logement.objects.filter(statut=Logement.Statut.PUBLIEE)


def filtrer(queryset, params):
    """Applique les filtres de la recherche avancée (dict ou QueryDict)."""
    get = params.get

    identifiants = [i for i in (_entier(v) for v in _liste(get("ids"))) if i]
    if identifiants:
        queryset = queryset.filter(pk__in=identifiants[:50])

    mots = (get("q") or "").strip()
    if mots:
        for mot in mots.split():
            queryset = queryset.filter(
                Q(titre__icontains=mot)
                | Q(description__icontains=mot)
                | Q(ville__icontains=mot)
                | Q(commune__icontains=mot)
                | Q(quartier__icontains=mot)
                | Q(region__icontains=mot)
                | Q(type_logement__icontains=mot)
            )

    for champ in ("ville", "commune", "quartier", "region"):
        valeur = (get(champ) or "").strip()
        if valeur:
            queryset = queryset.filter(**{f"{champ}__icontains": valeur})

    types = _liste(get("type") or get("type_logement"))
    if types:
        queryset = queryset.filter(type_logement__in=types)

    periodicites = _liste(get("periodicite"))
    if periodicites:
        queryset = queryset.filter(periodicite__in=periodicites)

    bornes = (
        ("prix_min", "prix__gte"),
        ("prix_max", "prix__lte"),
        ("chambres_min", "chambres__gte"),
        ("salles_de_bain_min", "salles_de_bain__gte"),
        ("superficie_min", "superficie__gte"),
        ("superficie_max", "superficie__lte"),
    )
    for param, lookup in bornes:
        valeur = _entier(get(param))
        if valeur is not None:
            queryset = queryset.filter(**{lookup: valeur})

    meuble = _booleen(get("meuble"))
    if meuble is not None:
        queryset = queryset.filter(meuble=meuble)

    if _booleen(get("verifie")):
        queryset = queryset.filter(verifie=True)

    if _booleen(get("visite")):
        queryset = queryset.filter(
            Exists(Panorama.objects.filter(logement=OuterRef("pk")))
        )

    for equipement in _liste(get("equipements")):
        identifiant = _entier(equipement)
        if identifiant is not None:
            queryset = queryset.filter(equipements__id=identifiant)

    # Disponibilité : aucune réservation bloquante sur la période demandée.
    debut, fin = get("disponible_du"), get("disponible_au")
    if debut and fin:
        from apps.reservations.models import Reservation

        queryset = queryset.exclude(
            Exists(
                Reservation.objects.filter(
                    logement=OuterRef("pk"),
                    statut__in=Reservation.BLOQUANTS,
                    date_debut__lt=fin,
                    date_fin__gt=debut,
                )
            )
        )

    # Zone visible de la carte.
    zone = [_decimal(get(c)) for c in ("lat_min", "lat_max", "lng_min", "lng_max")]
    if all(v is not None for v in zone):
        lat_min, lat_max, lng_min, lng_max = zone
        queryset = queryset.filter(
            latitude__gte=lat_min,
            latitude__lte=lat_max,
            longitude__gte=lng_min,
            longitude__lte=lng_max,
        )

    # Recherche autour d'une position.
    lat, lng = _decimal(get("lat")), _decimal(get("lng"))
    if lat is not None and lng is not None:
        rayon = _decimal(get("rayon_km")) or 0
        # 1° de latitude ≈ 111 km ; la longitude se contracte avec cos(latitude).
        cos_lat = max(math.cos(math.radians(lat)), 0.01)
        queryset = queryset.filter(latitude__isnull=False).annotate(
            distance_km=ExpressionWrapper(
                Sqrt(
                    (F("latitude") - Value(lat)) * (F("latitude") - Value(lat))
                    + (F("longitude") - Value(lng))
                    * (F("longitude") - Value(lng))
                    * Value(cos_lat * cos_lat)
                )
                * Value(111.0),
                output_field=FloatField(),
            )
        )
        if rayon > 0:
            queryset = queryset.filter(distance_km__lte=rayon)

    return queryset.distinct()


TRIS = {
    "prix_asc": ("prix", "-publie_le"),
    "prix_desc": ("-prix", "-publie_le"),
    "recent": ("-publie_le", "-cree_le"),
    "populaire": ("-nombre_vues", "-publie_le"),
    "note": (F("note_moyenne").desc(nulls_last=True), "-publie_le"),
}


def trier(queryset, tri):
    if tri == "proximite" and "distance_km" in queryset.query.annotations:
        return queryset.order_by("distance_km")
    return queryset.order_by(*TRIS.get(tri, TRIS["recent"]))


def notifier_alertes(logement):
    """Prévient les utilisateurs dont une recherche enregistrée correspond."""
    from apps.notifications.models import Notification
    from apps.notifications.services import notifier

    recherches = RechercheEnregistree.objects.filter(
        alerte_active=True
    ).exclude(utilisateur=logement.proprietaire).select_related("utilisateur")
    deja = set()
    for recherche in recherches:
        if recherche.utilisateur_id in deja:
            continue
        correspond = filtrer(
            Logement.objects.filter(pk=logement.pk), recherche.criteres
        ).exists()
        if correspond:
            deja.add(recherche.utilisateur_id)
            notifier(
                recherche.utilisateur,
                Notification.Type.ALERTE,
                "Nouvelle annonce pour votre alerte",
                f"« {logement.titre} » à {logement.ville} correspond à "
                f"votre recherche « {recherche.nom} ».",
                logement=logement.pk,
            )
    return len(deja)
