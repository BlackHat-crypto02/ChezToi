from django.urls import path

from .views import NotificationLireView, NotificationListView, NotificationNonLuesView

urlpatterns = [
    path("", NotificationListView.as_view(), name="notifications"),
    path("non-lues/", NotificationNonLuesView.as_view(), name="notifications-non-lues"),
    path("lire/", NotificationLireView.as_view(), name="notifications-lire-tout"),
    path("<int:pk>/lire/", NotificationLireView.as_view(), name="notification-lire"),
]
