from django.db.models import Count, Max, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, parsers, serializers, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.serializers import UtilisateurPublicSerializer
from apps.logements.models import Logement
from apps.notifications.models import Notification
from apps.notifications.services import notifier

from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    est_moi = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ("id", "auteur", "texte", "image", "lu", "cree_le", "est_moi")
        read_only_fields = ("id", "auteur", "lu", "cree_le", "est_moi")

    def get_est_moi(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.id == obj.auteur_id)


class ConversationSerializer(serializers.ModelSerializer):
    interlocuteur = serializers.SerializerMethodField()
    logement = serializers.SerializerMethodField()
    dernier_message = serializers.SerializerMethodField()
    non_lus = serializers.SerializerMethodField()
    bloquee = serializers.SerializerMethodField()
    bloquee_par_moi = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = (
            "id",
            "interlocuteur",
            "logement",
            "reservation",
            "dernier_message",
            "non_lus",
            "bloquee",
            "bloquee_par_moi",
            "modifie_le",
        )

    def _user(self):
        return self.context["request"].user

    def get_interlocuteur(self, obj):
        return UtilisateurPublicSerializer(obj.autre(self._user())).data

    def get_logement(self, obj):
        if obj.logement is None:
            return None
        photo = obj.logement.photo_principale
        request = self.context["request"]
        return {
            "id": obj.logement_id,
            "titre": obj.logement.titre,
            "ville": obj.logement.ville,
            "photo": request.build_absolute_uri(photo.image.url) if photo else None,
        }

    def get_dernier_message(self, obj):
        message = obj.messages.order_by("-cree_le").first()
        if message is None:
            return None
        return {
            "texte": message.texte or ("📷 Photo" if message.image else ""),
            "cree_le": message.cree_le,
            "est_moi": message.auteur_id == self._user().id,
        }

    def get_non_lus(self, obj):
        valeur = getattr(obj, "non_lus", None)
        if valeur is not None:
            return valeur
        return obj.messages.filter(lu=False).exclude(auteur=self._user()).count()

    def get_bloquee(self, obj):
        return obj.bloquee_par_id is not None

    def get_bloquee_par_moi(self, obj):
        return obj.bloquee_par_id == self._user().id


def mes_conversations(user):
    return (
        Conversation.objects.filter(Q(locataire=user) | Q(proprietaire=user))
        .select_related("locataire", "proprietaire", "logement")
        .prefetch_related("logement__photos")
        .annotate(
            non_lus=Count(
                "messages",
                filter=Q(messages__lu=False) & ~Q(messages__auteur=user),
            ),
            dernier=Max("messages__cree_le"),
        )
    )


class ConversationListView(generics.ListAPIView):
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return mes_conversations(self.request.user).order_by("-modifie_le")


class DemarrerConversationView(APIView):
    """Ouvre (ou retrouve) la conversation avec le propriétaire d'un logement."""

    def post(self, request):
        logement_id = request.data.get("logement")
        destinataire_id = request.data.get("destinataire")
        user = request.user

        logement = None
        if logement_id:
            logement = get_object_or_404(Logement, pk=logement_id)
            proprietaire = logement.proprietaire
            locataire = user
        elif destinataire_id:
            # Le propriétaire peut écrire à un locataire qui l'a sollicité.
            from django.contrib.auth import get_user_model

            autre = get_object_or_404(get_user_model(), pk=destinataire_id, is_active=True)
            if user.role == "proprietaire":
                proprietaire, locataire = user, autre
            else:
                proprietaire, locataire = autre, user
        else:
            raise ValidationError("Indiquez un logement ou un destinataire.")

        if proprietaire.id == locataire.id:
            raise ValidationError("Vous ne pouvez pas vous écrire à vous-même.")

        conversation, _ = Conversation.objects.get_or_create(
            locataire=locataire,
            proprietaire=proprietaire,
            logement=logement,
            defaults={"reservation_id": request.data.get("reservation") or None},
        )
        texte = str(request.data.get("texte", "")).strip()
        if texte:
            envoyer(conversation, user, texte=texte)
        conversation = mes_conversations(user).get(pk=conversation.pk)
        return Response(
            ConversationSerializer(conversation, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


def envoyer(conversation, auteur, texte="", image=None):
    if conversation.bloquee_par_id:
        raise PermissionDenied("Cette conversation est bloquée.")
    message = Message.objects.create(
        conversation=conversation, auteur=auteur, texte=texte, image=image
    )
    Conversation.objects.filter(pk=conversation.pk).update(modifie_le=timezone.now())
    destinataire = conversation.autre(auteur)
    # Une seule notification non lue par conversation pour ne pas inonder.
    deja = Notification.objects.filter(
        destinataire=destinataire,
        type=Notification.Type.MESSAGE,
        lue=False,
        donnees__conversation=conversation.pk,
    ).exists()
    if not deja:
        nom = auteur.get_full_name() or auteur.username
        notifier(
            destinataire,
            Notification.Type.MESSAGE,
            f"Nouveau message de {nom}",
            texte[:120] if texte else "📷 Photo",
            conversation=conversation.pk,
        )
    return message


def conversation_de(request, pk):
    return get_object_or_404(
        Conversation.objects.filter(
            Q(locataire=request.user) | Q(proprietaire=request.user)
        ),
        pk=pk,
    )


class MessagesView(APIView):
    """GET : historique (?apres=<id> pour ne récupérer que les nouveaux). POST : envoi."""

    parser_classes = [parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser]

    def get(self, request, pk):
        conversation = conversation_de(request, pk)
        messages = conversation.messages.all()
        apres = request.query_params.get("apres")
        if apres and apres.isdigit():
            messages = messages.filter(pk__gt=int(apres))
        # Ouvrir la conversation vaut lecture des messages reçus.
        conversation.messages.filter(lu=False).exclude(auteur=request.user).update(lu=True)
        Notification.objects.filter(
            destinataire=request.user,
            type=Notification.Type.MESSAGE,
            donnees__conversation=conversation.pk,
            lue=False,
        ).update(lue=True)
        return Response(
            MessageSerializer(
                messages[:500], many=True, context={"request": request}
            ).data
        )

    def post(self, request, pk):
        conversation = conversation_de(request, pk)
        texte = str(request.data.get("texte", "")).strip()
        image = request.FILES.get("image")
        if not texte and image is None:
            raise ValidationError("Le message est vide.")
        message = envoyer(conversation, request.user, texte=texte, image=image)
        return Response(
            MessageSerializer(message, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class BloquerView(APIView):
    """POST : bloquer l'interlocuteur. DELETE : débloquer (si c'est moi qui ai bloqué)."""

    def post(self, request, pk):
        conversation = conversation_de(request, pk)
        if conversation.bloquee_par_id is None:
            conversation.bloquee_par = request.user
            conversation.save(update_fields=["bloquee_par"])
        return Response({"bloquee": True})

    def delete(self, request, pk):
        conversation = conversation_de(request, pk)
        if conversation.bloquee_par_id == request.user.id:
            conversation.bloquee_par = None
            conversation.save(update_fields=["bloquee_par"])
        return Response({"bloquee": conversation.bloquee_par_id is not None})


class NonLusView(APIView):
    def get(self, request):
        total = (
            Message.objects.filter(
                Q(conversation__locataire=request.user)
                | Q(conversation__proprietaire=request.user),
                lu=False,
            )
            .exclude(auteur=request.user)
            .count()
        )
        return Response({"non_lus": total})
