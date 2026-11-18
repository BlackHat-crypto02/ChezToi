"""Remplit la base avec des données de démonstration (idempotent).

    python manage.py seed_demo
"""

from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files import File
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.logements.models import Equipement, Favori, Logement, Photo
from apps.messagerie.models import Conversation, Message
from apps.reservations.models import Avis, Reservation

User = get_user_model()

EQUIPEMENTS = [
    ("Climatisation", "temp_cold_line"),
    ("Ventilateur", "windy_line"),
    ("Cuisine équipée", "restaurant_line"),
    ("Parking", "parking_box_line"),
    ("Garage", "car_line"),
    ("Piscine", "water_flash_line"),
    ("Jardin", "plant_line"),
    ("Balcon", "door_open_line"),
    ("Terrasse", "sun_line"),
    ("Groupe électrogène", "flashlight_line"),
    ("Accès à l'eau", "drop_line"),
    ("Forage", "contrast_drop_line"),
    ("Sécurité", "shield_check_line"),
    ("Connexion Internet", "wifi_line"),
    ("Meubles", "sofa_line"),
    ("Buanderie", "t_shirt_air_line"),
    ("Chauffe-eau", "fire_line"),
]

# (titre, type, ville, quartier, région, lat, lng, prix, périodicité, chambres, meublé, image)
LOGEMENTS = [
    ("Villa avec piscine à Lomé II", "villa", "Lomé", "Lomé II", "Maritime", 6.1725, 1.2314, 850000, "mois", 4, True, "maison"),
    ("Appartement 3 pièces à Bè", "appartement", "Lomé", "Bè", "Maritime", 6.1330, 1.2400, 180000, "mois", 2, False, "immeuble"),
    ("Studio meublé à Tokoin", "studio", "Lomé", "Tokoin", "Maritime", 6.1500, 1.2150, 95000, "mois", 1, True, "immeuble"),
    ("Chambre étudiante près de l'université", "chambre", "Lomé", "Adidogomé", "Maritime", 6.1870, 1.1600, 35000, "mois", 1, False, "maison"),
    ("Duplex moderne à Agoè", "duplex", "Lomé", "Agoè", "Maritime", 6.2280, 1.2050, 400000, "mois", 3, False, "immeuble"),
    ("Maison familiale à Kpalimé", "maison", "Kpalimé", "Centre", "Plateaux", 6.9000, 0.6300, 150000, "mois", 3, False, "maison"),
    ("Appartement vue collines", "appartement", "Kpalimé", "Kpodzi", "Plateaux", 6.9100, 0.6250, 25000, "nuit", 2, True, "immeuble"),
    ("Maison 4 pièces à Kara", "maison", "Kara", "Tomdè", "Kara", 9.5511, 1.1861, 120000, "mois", 3, False, "maison"),
    ("Studio climatisé à Sokodé", "studio", "Sokodé", "Komah", "Centrale", 8.9833, 1.1333, 60000, "mois", 1, True, "immeuble"),
    ("Villa de vacances à Aného", "villa", "Aného", "Zébé", "Maritime", 6.2280, 1.5950, 60000, "nuit", 3, True, "maison"),
    ("Appartement standing à Baguida", "appartement", "Lomé", "Baguida", "Maritime", 6.1600, 1.3200, 250000, "mois", 2, True, "immeuble"),
    ("Maison avec jardin à Atakpamé", "maison", "Atakpamé", "Djama", "Plateaux", 7.5333, 1.1333, 90000, "mois", 2, False, "maison"),
]


class Command(BaseCommand):
    help = "Crée des comptes, équipements et annonces de démonstration."

    def _user(self, username, email, role, mot_de_passe, **extra):
        user, cree = User.objects.get_or_create(
            username=username,
            defaults={"email": email, "role": role, **extra},
        )
        if cree:
            user.set_password(mot_de_passe)
            user.save()
        return user

    @transaction.atomic
    def handle(self, *args, **options):
        self._user(
            "uriel",
            "uriel@cheztoi.tg",
            User.Role.ADMIN,
            "2alvin2@",
            first_name="Uriel",
            is_staff=True,
            is_superuser=True,
            verified=True,
        )
        proprio = self._user(
            "proprio",
            "proprio@cheztoi.tg",
            User.Role.PROPRIETAIRE,
            "motdepasse123",
            first_name="Komi",
            last_name="Mensah",
            phone="+228 90 11 22 33",
            city="Lomé",
            verified=True,
        )
        proprio2 = self._user(
            "afi",
            "afi@cheztoi.tg",
            User.Role.PROPRIETAIRE,
            "motdepasse123",
            first_name="Afi",
            last_name="Agbeko",
            phone="+228 91 44 55 66",
            city="Kpalimé",
        )
        locataire = self._user(
            "locataire",
            "locataire@cheztoi.tg",
            User.Role.LOCATAIRE,
            "motdepasse123",
            first_name="Kossi",
            last_name="Doe",
            phone="+228 92 77 88 99",
            city="Lomé",
        )

        equipements = []
        for nom, icone in EQUIPEMENTS:
            equipement, _ = Equipement.objects.get_or_create(
                nom=nom, defaults={"icone": icone}
            )
            equipements.append(equipement)

        assets = Path(settings.BASE_DIR).parent / "cheztoi" / "assets"
        maintenant = timezone.now()
        logements = []
        for index, ligne in enumerate(LOGEMENTS):
            (titre, type_, ville, quartier, region, lat, lng, prix, periodicite,
             chambres, meuble, image) = ligne
            proprietaire = proprio if index % 3 else proprio2
            logement, cree = Logement.objects.get_or_create(
                titre=titre,
                defaults={
                    "proprietaire": proprietaire,
                    "description": (
                        f"{titre}. Logement lumineux et bien entretenu situé à "
                        f"{quartier}, {ville}. Proche des commerces, écoles et "
                        "transports. Visite possible sur rendez-vous."
                    ),
                    "type_logement": type_,
                    "meuble": meuble,
                    "chambres": chambres,
                    "salons": 1 if type_ not in ("studio", "chambre") else 0,
                    "salles_de_bain": max(1, chambres - 1),
                    "toilettes": max(1, chambres - 1),
                    "superficie": 25 + chambres * 30,
                    "capacite": chambres * 2,
                    "prix": prix,
                    "periodicite": periodicite,
                    "caution": prix * 2 if periodicite == "mois" else 0,
                    "avance": prix * 3 if periodicite == "mois" else 0,
                    "frais_supplementaires": 10000 if periodicite == "nuit" else 0,
                    "conditions_paiement": "Paiement par Mobile Money ou espèces.",
                    "conditions_annulation": "Annulation gratuite jusqu'à 7 jours avant l'arrivée.",
                    "reservation_instantanee": periodicite == "nuit",
                    "ville": ville,
                    "quartier": quartier,
                    "region": region,
                    "adresse": f"Rue {index + 12}, {quartier}",
                    "latitude": lat,
                    "longitude": lng,
                    "statut": Logement.Statut.PUBLIEE,
                    "verifie": index % 2 == 0,
                    "nombre_vues": (len(LOGEMENTS) - index) * 17,
                    "publie_le": maintenant - timedelta(days=index),
                },
            )
            if cree:
                logement.equipements.set(equipements[index % 5 :: 3])
                fichier = assets / f"{image}.webp"
                if fichier.exists():
                    with fichier.open("rb") as f:
                        Photo.objects.create(
                            logement=logement,
                            image=File(f, name=f"{image}-{logement.pk}.webp"),
                            principale=True,
                        )
            logements.append(logement)

        # Une annonce en attente de validation pour la modération.
        Logement.objects.get_or_create(
            titre="Appartement neuf à Avédji (en attente)",
            defaults={
                "proprietaire": proprio,
                "type_logement": "appartement",
                "ville": "Lomé",
                "quartier": "Avédji",
                "prix": 200000,
                "statut": Logement.Statut.EN_ATTENTE,
                "latitude": 6.1950,
                "longitude": 1.1950,
            },
        )

        Favori.objects.get_or_create(utilisateur=locataire, logement=logements[0])
        Favori.objects.get_or_create(utilisateur=locataire, logement=logements[2])

        aujourd_hui = timezone.localdate()
        if not Reservation.objects.filter(locataire=locataire).exists():
            passee = Reservation(
                logement=logements[1],
                locataire=locataire,
                date_debut=aujourd_hui - timedelta(days=60),
                date_fin=aujourd_hui - timedelta(days=30),
                statut=Reservation.Statut.TERMINEE,
            )
            passee.calculer_montants()
            passee.save()
            Avis.objects.create(
                reservation=passee,
                logement=passee.logement,
                auteur=locataire,
                note_etat=4,
                note_conformite=5,
                note_proprete=4,
                note_communication=5,
                note_qualite_prix=4,
                commentaire="Très bon séjour, propriétaire réactif.",
            )
            demande = Reservation(
                logement=logements[4],
                locataire=locataire,
                date_debut=aujourd_hui + timedelta(days=10),
                date_fin=aujourd_hui + timedelta(days=70),
                message="Bonjour, je suis intéressé pour deux mois.",
            )
            demande.calculer_montants()
            demande.save()

        conversation, cree = Conversation.objects.get_or_create(
            locataire=locataire,
            proprietaire=logements[4].proprietaire,
            logement=logements[4],
        )
        if cree:
            Message.objects.create(
                conversation=conversation,
                auteur=locataire,
                texte="Bonjour, le duplex est-il toujours disponible ?",
            )
            Message.objects.create(
                conversation=conversation,
                auteur=logements[4].proprietaire,
                texte="Bonjour ! Oui, il est disponible. Voulez-vous le visiter ?",
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Données de démo prêtes.\n"
                "  Admin       : uriel / 2alvin2@\n"
                "  Propriétaire: proprio@cheztoi.tg / motdepasse123\n"
                "  Locataire   : locataire@cheztoi.tg / motdepasse123"
            )
        )

