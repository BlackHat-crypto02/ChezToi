"""Point d'entrée unique pour créer une notification depuis les autres apps."""

from .models import Notification

# Catégories réglables par l'utilisateur dans l'application.
CATEGORIES = {
    "reservations": (
        Notification.Type.RESERVATION_NOUVELLE,
        Notification.Type.RESERVATION_ACCEPTEE,
        Notification.Type.RESERVATION_REFUSEE,
        Notification.Type.RESERVATION_CONFIRMEE,
        Notification.Type.RESERVATION_ANNULEE,
    ),
    "messages": (Notification.Type.MESSAGE,),
    "alertes": (Notification.Type.ALERTE,),
    "annonces": (
        Notification.Type.ANNONCE_VALIDEE,
        Notification.Type.ANNONCE_REFUSEE,
        Notification.Type.ANNONCE_SUSPENDUE,
    ),
    "avis": (Notification.Type.AVIS,),
}


def categorie_de(type):
    for categorie, types in CATEGORIES.items():
        if type in types:
            return categorie
    return None


def notifier(destinataire, type, titre, message="", **donnees):
    if destinataire is None or not destinataire.is_active:
        return None
    categorie = categorie_de(type)
    preferences = destinataire.preferences_notifications or {}
    if categorie and preferences.get(categorie) is False:
        return None
    return Notification.objects.create(
        destinataire=destinataire,
        type=type,
        titre=titre,
        message=message,
        donnees={cle: valeur for cle, valeur in donnees.items() if valeur is not None},
    )
