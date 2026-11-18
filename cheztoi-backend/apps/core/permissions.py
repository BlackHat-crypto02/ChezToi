from rest_framework import permissions


def est_admin(user):
    return bool(
        user
        and user.is_authenticated
        and user.role == "admin"
        and user.is_staff
    )


class EstAdministrateur(permissions.BasePermission):
    """Accès back-office : rôle administrateur et compte staff."""

    message = "Réservé aux administrateurs."

    def has_permission(self, request, view):
        return est_admin(request.user)


class EstProprietaire(permissions.BasePermission):
    """Espace propriétaire de l'application mobile."""

    message = "Réservé aux propriétaires. Activez l'espace propriétaire dans votre profil."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.role == "proprietaire"
        )
