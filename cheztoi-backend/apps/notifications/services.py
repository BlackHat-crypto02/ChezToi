"""Point d'entrée unique pour créer une notification depuis les autres apps."""

from .models import Notification


def notifier(destinataire, type, titre, message="", **donnees):
    if destinataire is None or not destinataire.is_active:
        return None
    return Notification.objects.create(
        destinataire=destinataire,
        type=type,
        titre=titre,
        message=message,
        donnees={cle: valeur for cle, valeur in donnees.items() if valeur is not None},
    )
