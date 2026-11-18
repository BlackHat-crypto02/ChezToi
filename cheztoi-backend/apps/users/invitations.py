"""Invitation par e-mail des administrateurs (inspiré du projet Orbit)."""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.core.mail import EmailMultiAlternatives
from django.utils.html import escape

User = get_user_model()

SALT = "cheztoi-admin-invitation"


class InvitationInvalide(ValueError):
    """Le lien d'invitation est invalide, expiré ou déjà utilisé."""


def creer_token(user):
    """Jeton signé et horodaté, valable INVITATION_TTL secondes."""
    return signing.dumps(
        {"user_id": user.id, "purpose": "setup"},
        salt=SALT,
    )


def lire_token(token):
    """Retourne l'utilisateur concerné ou lève InvitationInvalide."""
    try:
        donnees = signing.loads(
            token,
            salt=SALT,
            max_age=settings.INVITATION_TTL,
        )
    except signing.SignatureExpired as erreur:
        raise InvitationInvalide("Ce lien d'invitation a expiré.") from erreur
    except signing.BadSignature as erreur:
        raise InvitationInvalide("Ce lien d'invitation est invalide.") from erreur

    if donnees.get("purpose") != "setup":
        raise InvitationInvalide("Ce lien d'invitation est invalide.")

    user = User.objects.filter(
        id=donnees.get("user_id"),
        role=User.Role.ADMIN,
        password_temporary=True,
    ).first()
    if user is None:
        raise InvitationInvalide("Cette invitation n'est plus valable.")
    return user


def lien_invitation(user):
    return f"{settings.APP_BASE_URL}/setup-mot-de-passe?token={creer_token(user)}"


def envoyer_invitation(user):
    """Envoie le lien de configuration du mot de passe."""
    lien = lien_invitation(user)
    prenom = user.first_name or user.username
    objet = "Bienvenue sur ChezToi — définissez votre mot de passe"

    texte = (
        f"Bonjour {prenom},\n\n"
        "Un administrateur vient de créer votre compte sur l'administration ChezToi.\n"
        "Cliquez sur le lien ci-dessous pour choisir votre mot de passe :\n\n"
        f"{lien}\n\n"
        "Ce lien est valable 24 heures.\n\n"
        "L'équipe ChezToi"
    )
    html = (
        "<div style=\"font-family:Arial,sans-serif;color:#1f2937\">"
        "<p>Bonjour {prenom},</p>"
        "<p>Un administrateur vient de créer votre compte sur "
        "l'administration ChezToi.</p>"
        "<p><a href=\"{lien}\" style=\"display:inline-block;padding:12px 20px;"
        "background:#0f766e;color:#ffffff;text-decoration:none;border-radius:8px\">"
        "Définir mon mot de passe</a></p>"
        "<p>Ou copier ce lien dans votre navigateur :<br>{lien}</p>"
        "<p>Ce lien est valable 24 heures.</p>"
        "<p>L'équipe ChezToi</p>"
        "</div>"
    ).format(prenom=escape(prenom), lien=escape(lien))

    message = EmailMultiAlternatives(
        objet,
        texte,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
    )
    message.attach_alternative(html, "text/html")
    message.send(fail_silently=False)
