from django.urls import path

from . import views

urlpatterns = [
    path("", views.ConversationListView.as_view(), name="conversations"),
    path("demarrer/", views.DemarrerConversationView.as_view(), name="conversation-demarrer"),
    path("non-lus/", views.NonLusView.as_view(), name="messages-non-lus"),
    path("<int:pk>/messages/", views.MessagesView.as_view(), name="conversation-messages"),
    path("<int:pk>/bloquer/", views.BloquerView.as_view(), name="conversation-bloquer"),
]
