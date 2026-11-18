from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminInvitationView,
    AdminLoginView,
    MeView,
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
    path("setup-password/", SetupPasswordView.as_view(), name="setup-password"),
]
