from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .compte import (
    ChangerMotDePasseView,
    ConfirmationReinitialisationView,
    DemandeReinitialisationView,
    MeView,
)
from .views import (
    AdminInvitationView,
    AdminLoginView,
    MobileLoginView,
    RegisterView,
    RenvoyerInvitationView,
    SetupPasswordView,
    UserListView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", MobileLoginView.as_view(), name="mobile-login"),
    path("admin-login/", AdminLoginView.as_view(), name="admin-login"),
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("users/", UserListView.as_view(), name="user-list"),
    path("admin/users/", AdminInvitationView.as_view(), name="admin-user-create"),
    path(
        "admin/users/<int:pk>/invitation/",
        RenvoyerInvitationView.as_view(),
        name="admin-user-resend",
    ),
    path("change-password/", ChangerMotDePasseView.as_view(), name="change-password"),
    path("password-reset/", DemandeReinitialisationView.as_view(), name="password-reset"),
    path(
        "password-reset/confirm/",
        ConfirmationReinitialisationView.as_view(),
        name="password-reset-confirm",
    ),
    path("setup-password/", SetupPasswordView.as_view(), name="setup-password"),
]
