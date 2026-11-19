"""Parcours bout en bout de l'API : annonces, réservations, messagerie, admin."""

import shutil
import tempfile
from datetime import timedelta
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APITestCase

from apps.logements.models import Equipement, Logement, RechercheEnregistree
from apps.notifications.models import Notification
from apps.reservations.models import Reservation

User = get_user_model()
MEDIA = tempfile.mkdtemp()


def image(nom="photo.jpg"):
    tampon = BytesIO()
    Image.new("RGB", (20, 20), "purple").save(tampon, "JPEG")
    return SimpleUploadedFile(nom, tampon.getvalue(), content_type="image/jpeg")


@override_settings(MEDIA_ROOT=MEDIA)
class ParcoursTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        self.proprio = User.objects.create_user(
            "proprio", "proprio@x.tg", "motdepasse123", role="proprietaire", phone="+228 1"
        )
        self.locataire = User.objects.create_user(
            "loc", "loc@x.tg", "motdepasse123", role="locataire", phone="+228 2"
        )
        self.autre = User.objects.create_user(
            "autre", "autre@x.tg", "motdepasse123", role="locataire"
        )
        self.admin = User.objects.create_user(
            "admin", "admin@x.tg", "motdepasse123", role="admin", is_staff=True
        )
        self.clim = Equipement.objects.create(nom="Climatisation")

    def connecter(self, user):
        self.client.force_authenticate(user)

    def creer_annonce(self, **extra):
        self.connecter(self.proprio)
        donnees = {
            "titre": "Studio Tokoin",
            "type_logement": "studio",
            "prix": 100000,
            "periodicite": "mois",
            "ville": "Lomé",
            "quartier": "Tokoin",
            "adresse": "Rue secrète 12",
            "latitude": 6.151234,
            "longitude": 1.215678,
            "equipement_ids": [self.clim.id],
            "caution": 50000,
        }
        donnees.update(extra)
        reponse = self.client.post("/api/v1/mes-logements/", donnees, format="json")
        self.assertEqual(reponse.status_code, 201, reponse.data)
        return reponse.data["id"]

    def publier(self, logement_id):
        self.connecter(self.proprio)
        r = self.client.post(
            f"/api/v1/mes-logements/{logement_id}/photos/",
            {"image": image()},
            format="multipart",
        )
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(r.data["principale"])
        r = self.client.post(f"/api/v1/mes-logements/{logement_id}/soumettre/")
        self.assertEqual(r.data["statut"], "en_attente")
        self.connecter(self.admin)
        r = self.client.post(
            f"/api/v1/admin/logements/{logement_id}/moderer/",
            {"action": "valider"},
            format="json",
        )
        self.assertEqual(r.data["statut"], "publiee", r.data)

    def test_publication_et_recherche(self):
        logement_id = self.creer_annonce()

        # Soumission impossible sans photo, invisible tant que non publiée.
        r = self.client.post(f"/api/v1/mes-logements/{logement_id}/soumettre/")
        self.assertEqual(r.status_code, 400)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(f"/api/v1/logements/{logement_id}/").status_code, 404)

        RechercheEnregistree.objects.create(
            utilisateur=self.locataire, nom="Lomé pas cher", criteres={"ville": "lomé", "prix_max": 150000}
        )
        self.publier(logement_id)
        self.assertTrue(
            Notification.objects.filter(destinataire=self.locataire, type="alerte").exists()
        )

        self.client.force_authenticate(None)
        r = self.client.get("/api/v1/logements/", {"ville": "lomé", "prix_max": 120000})
        self.assertEqual(r.data["count"], 1)
        self.assertEqual(
            self.client.get("/api/v1/logements/", {"prix_min": 200000}).data["count"], 0
        )
        r = self.client.get("/api/v1/logements/", {"equipements": str(self.clim.id)})
        self.assertEqual(r.data["count"], 1)
        r = self.client.get("/api/v1/logements/", {"lat": 6.15, "lng": 1.21, "rayon_km": 5, "tri": "proximite"})
        self.assertEqual(r.data["count"], 1)
        self.assertIsNotNone(r.data["results"][0]["distance_km"])

        # Adresse masquée et coordonnées arrondies pour le public.
        fiche = self.client.get(f"/api/v1/logements/{logement_id}/").data
        self.assertEqual(fiche["adresse"], "")
        self.assertEqual(fiche["latitude"], 6.151)
        self.assertEqual(Logement.objects.get(pk=logement_id).nombre_vues, 1)

        accueil = self.client.get("/api/v1/logements/accueil/").data
        self.assertEqual(len(accueil["recents"]), 1)
        self.assertEqual(accueil["villes"][0]["ville"], "Lomé")

    def test_favoris(self):
        logement_id = self.creer_annonce()
        self.publier(logement_id)
        self.connecter(self.locataire)
        self.client.post(f"/api/v1/logements/{logement_id}/favori/")
        self.client.post(f"/api/v1/logements/{logement_id}/favori/")
        r = self.client.get("/api/v1/favoris/")
        self.assertEqual(len(r.data), 1)
        self.assertTrue(r.data[0]["est_favori"])
        self.client.delete(f"/api/v1/logements/{logement_id}/favori/")
        self.assertEqual(len(self.client.get("/api/v1/favoris/").data), 0)

    def test_reservation_complete(self):
        logement_id = self.creer_annonce()
        self.publier(logement_id)
        debut = timezone.localdate() + timedelta(days=5)
        fin = debut + timedelta(days=45)

        self.connecter(self.locataire)
        r = self.client.post(
            "/api/v1/reservations/",
            {"logement": logement_id, "date_debut": debut, "date_fin": fin},
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.data)
        reservation_id = r.data["id"]
        # 45 jours au mois = 2 périodes, + caution.
        self.assertEqual(r.data["periodes"], 2)
        self.assertEqual(r.data["montant_total"], 250000)
        self.assertEqual(r.data["statut"], "en_attente")
        self.assertTrue(
            Notification.objects.filter(destinataire=self.proprio, type="reservation_nouvelle").exists()
        )

        # Un autre locataire demande une période qui chevauche.
        self.connecter(self.autre)
        r = self.client.post(
            "/api/v1/reservations/",
            {"logement": logement_id, "date_debut": debut + timedelta(days=3), "date_fin": fin},
            format="json",
        )
        concurrente_id = r.data["id"]

        # Le locataire ne peut pas accepter lui-même.
        self.connecter(self.locataire)
        r = self.client.post(f"/api/v1/reservations/{reservation_id}/accepter/")
        self.assertEqual(r.status_code, 403)

        self.connecter(self.proprio)
        r = self.client.get("/api/v1/reservations/recues/")
        self.assertEqual(len(r.data), 2)
        r = self.client.post(f"/api/v1/reservations/{reservation_id}/accepter/")
        self.assertEqual(r.data["statut"], "confirmee")
        self.assertEqual(r.data["telephone_contact"], "+228 2")
        self.assertEqual(
            Reservation.objects.get(pk=concurrente_id).statut, "refusee"
        )

        # Double réservation interdite.
        self.connecter(self.autre)
        r = self.client.post(
            "/api/v1/reservations/",
            {"logement": logement_id, "date_debut": debut, "date_fin": debut + timedelta(days=2)},
            format="json",
        )
        self.assertEqual(r.status_code, 400)

        # L'adresse devient visible au locataire confirmé.
        self.connecter(self.locataire)
        fiche = self.client.get(f"/api/v1/logements/{logement_id}/").data
        self.assertEqual(fiche["adresse"], "Rue secrète 12")

        # Fin du séjour → avis possible.
        Reservation.objects.filter(pk=reservation_id).update(
            date_debut=timezone.localdate() - timedelta(days=40),
            date_fin=timezone.localdate() - timedelta(days=1),
        )
        r = self.client.get(f"/api/v1/reservations/{reservation_id}/")
        self.assertEqual(r.data["statut"], "terminee")
        self.assertTrue(r.data["peut_evaluer"])
        notes = {
            "note_etat": 5,
            "note_conformite": 4,
            "note_proprete": 5,
            "note_communication": 4,
            "note_qualite_prix": 5,
            "commentaire": "Parfait",
        }
        r = self.client.post(f"/api/v1/reservations/{reservation_id}/avis/", notes, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["note_globale"], 4.6)
        r = self.client.post(f"/api/v1/reservations/{reservation_id}/avis/", notes, format="json")
        self.assertEqual(r.status_code, 400)

        fiche = self.client.get(f"/api/v1/logements/{logement_id}/").data
        self.assertEqual(fiche["note_moyenne"], 4.6)
        self.assertEqual(fiche["nombre_avis"], 1)

    def test_reservation_instantanee_et_annulation(self):
        logement_id = self.creer_annonce(periodicite="nuit", prix=20000, reservation_instantanee=True)
        self.publier(logement_id)
        self.connecter(self.locataire)
        debut = timezone.localdate() + timedelta(days=1)
        r = self.client.post(
            "/api/v1/reservations/",
            {"logement": logement_id, "date_debut": debut, "date_fin": debut + timedelta(days=3)},
            format="json",
        )
        self.assertEqual(r.data["statut"], "confirmee")
        self.assertEqual(r.data["montant_location"], 60000)
        r = self.client.post(f"/api/v1/reservations/{r.data['id']}/annuler/", {"motif": "Imprévu"})
        self.assertEqual(r.data["statut"], "annulee")

    def test_messagerie(self):
        logement_id = self.creer_annonce()
        self.publier(logement_id)
        self.connecter(self.locataire)
        r = self.client.post(
            "/api/v1/conversations/demarrer/",
            {"logement": logement_id, "texte": "Bonjour !"},
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.data)
        conversation_id = r.data["id"]
        self.assertEqual(r.data["interlocuteur"]["id"], self.proprio.id)

        self.connecter(self.proprio)
        self.assertEqual(self.client.get("/api/v1/conversations/non-lus/").data["non_lus"], 1)
        messages = self.client.get(f"/api/v1/conversations/{conversation_id}/messages/").data
        self.assertEqual(messages[0]["texte"], "Bonjour !")
        self.assertEqual(self.client.get("/api/v1/conversations/non-lus/").data["non_lus"], 0)
        r = self.client.post(
            f"/api/v1/conversations/{conversation_id}/messages/",
            {"texte": "Oui ?"},
            format="json",
        )
        self.assertTrue(r.data["est_moi"])

        # Un tiers n'a pas accès à la conversation.
        self.connecter(self.autre)
        r = self.client.get(f"/api/v1/conversations/{conversation_id}/messages/")
        self.assertEqual(r.status_code, 404)

        # Blocage.
        self.connecter(self.locataire)
        self.client.post(f"/api/v1/conversations/{conversation_id}/bloquer/")
        self.connecter(self.proprio)
        r = self.client.post(
            f"/api/v1/conversations/{conversation_id}/messages/",
            {"texte": "Hé"},
            format="json",
        )
        self.assertEqual(r.status_code, 403)

    def test_signalement_et_moderation(self):
        logement_id = self.creer_annonce()
        self.publier(logement_id)
        self.connecter(self.locataire)
        r = self.client.post(
            "/api/v1/signalements/",
            {"logement": logement_id, "motif": "photos_trompeuses", "description": "Rien à voir"},
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.data)

        self.connecter(self.admin)
        stats = self.client.get("/api/v1/admin/statistiques/").data
        self.assertEqual(stats["signalements_ouverts"], 1)
        self.assertEqual(stats["annonces_publiees"], 1)
        r = self.client.patch(
            f"/api/v1/admin/signalements/{r.data['id']}/",
            {"statut": "resolu", "decision": "Annonce suspendue."},
            format="json",
        )
        self.assertEqual(r.data["statut"], "resolu")
        r = self.client.post(
            f"/api/v1/admin/logements/{logement_id}/moderer/",
            {"action": "suspendre", "motif": "Photos trompeuses"},
            format="json",
        )
        self.assertEqual(r.data["statut"], "suspendue")
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/v1/logements/").data["count"], 0)

        # Les routes admin sont fermées aux autres rôles.
        self.connecter(self.proprio)
        self.assertEqual(self.client.get("/api/v1/admin/statistiques/").status_code, 403)

    def test_espace_proprietaire_reserve(self):
        self.connecter(self.locataire)
        r = self.client.post("/api/v1/mes-logements/", {"titre": "x"}, format="json")
        self.assertEqual(r.status_code, 403)
        # Le locataire peut activer son espace propriétaire.
        r = self.client.patch("/api/v1/auth/me/", {"role": "proprietaire"}, format="json")
        self.assertEqual(r.data["role"], "proprietaire")
        r = self.client.patch("/api/v1/auth/me/", {"role": "admin"}, format="json")
        self.assertEqual(r.status_code, 400)


class CompteTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            "kossi", "kossi@x.tg", "motdepasse123", role="locataire"
        )

    def test_reinitialisation_mot_de_passe(self):
        r = self.client.post("/api/v1/auth/password-reset/", {"email": "kossi@x.tg"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        code = [m for m in mail.outbox[0].body.split() if m.isdigit() and len(m) == 6][0]

        r = self.client.post(
            "/api/v1/auth/password-reset/confirm/",
            {"email": "kossi@x.tg", "code": "000000" if code != "000000" else "111111", "password": "Nouveau-mdp-2026"},
        )
        self.assertEqual(r.status_code, 400)
        r = self.client.post(
            "/api/v1/auth/password-reset/confirm/",
            {"email": "kossi@x.tg", "code": code, "password": "Nouveau-mdp-2026"},
        )
        self.assertEqual(r.status_code, 200, r.data)
        r = self.client.post(
            "/api/v1/auth/login/",
            {"email": "kossi@x.tg", "password": "Nouveau-mdp-2026"},
        )
        self.assertEqual(r.status_code, 200)
        self.assertIn("verified", r.data["user"])

    def test_changement_et_suppression(self):
        self.client.force_authenticate(self.user)
        r = self.client.post(
            "/api/v1/auth/change-password/",
            {"ancien": "faux", "nouveau": "Nouveau-mdp-2026"},
        )
        self.assertEqual(r.status_code, 400)
        r = self.client.post(
            "/api/v1/auth/change-password/",
            {"ancien": "motdepasse123", "nouveau": "Nouveau-mdp-2026"},
        )
        self.assertEqual(r.status_code, 200)
        r = self.client.delete("/api/v1/auth/me/", {"password": "Nouveau-mdp-2026"}, format="json")
        self.assertEqual(r.status_code, 204)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)


@override_settings(MEDIA_ROOT=MEDIA)
class EvolutionsMobileTests(APITestCase):
    def setUp(self):
        self.proprio = User.objects.create_user(
            "proprio", "proprio@x.tg", "motdepasse123", role="proprietaire",
            phone="+228 90 11 22 33",
        )
        self.locataire = User.objects.create_user(
            "loc", "loc@x.tg", "motdepasse123", role="locataire"
        )
        self.admin = User.objects.create_user(
            "admin", "admin@x.tg", "motdepasse123", role="admin", is_staff=True
        )

    def test_connexion_par_telephone(self):
        r = self.client.post(
            "/api/v1/auth/login/", {"email": "90 11 22 33", "password": "motdepasse123"}
        )
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["user"]["email"], "proprio@x.tg")
        r = self.client.post(
            "/api/v1/auth/login/", {"email": "99 99 99 99", "password": "motdepasse123"}
        )
        self.assertEqual(r.status_code, 401)
        # Un numéro déjà utilisé est refusé à l'inscription.
        r = self.client.post(
            "/api/v1/auth/register/",
            {"email": "n@x.tg", "password": "motdepasse123", "role": "locataire", "phone": "90112233"},
        )
        self.assertEqual(r.status_code, 400)

    def test_preferences_coupent_les_notifications(self):
        self.client.force_authenticate(self.locataire)
        r = self.client.get("/api/v1/auth/preferences/")
        self.assertTrue(all(r.data.values()))
        r = self.client.patch("/api/v1/auth/preferences/", {"messages": False}, format="json")
        self.assertFalse(r.data["messages"])
        from apps.notifications.services import notifier

        self.locataire.refresh_from_db()
        self.assertIsNone(notifier(self.locataire, Notification.Type.MESSAGE, "Coucou"))
        self.assertIsNotNone(notifier(self.locataire, Notification.Type.ALERTE, "Alerte"))

    def test_verification_du_proprietaire(self):
        self.client.force_authenticate(self.proprio)
        r = self.client.post(
            "/api/v1/auth/justificatifs/",
            {"type": "piece_identite", "fichier": image("cni.jpg")},
            format="multipart",
        )
        self.assertEqual(r.status_code, 201, r.data)
        self.assertNotIn("fichier", r.data)
        justificatif_id = r.data["id"]
        r = self.client.post(
            "/api/v1/auth/justificatifs/",
            {"type": "autre", "fichier": SimpleUploadedFile("x.exe", b"MZ")},
            format="multipart",
        )
        self.assertEqual(r.status_code, 400)

        # Le fichier n'est accessible qu'à l'admin.
        r = self.client.get(f"/api/v1/admin/justificatifs/{justificatif_id}/fichier/")
        self.assertEqual(r.status_code, 403)
        self.client.force_authenticate(self.admin)
        r = self.client.get(f"/api/v1/admin/justificatifs/{justificatif_id}/fichier/")
        self.assertEqual(r.status_code, 200)
        r = self.client.patch(
            f"/api/v1/admin/justificatifs/{justificatif_id}/", {"statut": "refuse"}, format="json"
        )
        self.assertEqual(r.status_code, 400)
        r = self.client.patch(
            f"/api/v1/admin/justificatifs/{justificatif_id}/", {"statut": "accepte"}, format="json"
        )
        self.assertEqual(r.data["statut"], "accepte")
        self.proprio.refresh_from_db()
        self.assertTrue(self.proprio.verified)

        self.client.force_authenticate(self.proprio)
        r = self.client.get("/api/v1/auth/justificatifs/")
        self.assertTrue(r.data["verifie"])

    def test_videos_et_filtre_ids(self):
        self.client.force_authenticate(self.proprio)
        r = self.client.post(
            "/api/v1/mes-logements/",
            {"titre": "Studio", "type_logement": "studio", "prix": 50000, "ville": "Lomé"},
            format="json",
        )
        logement_id = r.data["id"]
        r = self.client.post(
            f"/api/v1/mes-logements/{logement_id}/videos/",
            {"fichier": SimpleUploadedFile("visite.mp4", b"\x00" * 100, content_type="video/mp4")},
            format="multipart",
        )
        self.assertEqual(r.status_code, 201, r.data)
        fiche = self.client.get(f"/api/v1/mes-logements/{logement_id}/").data
        self.assertEqual(len(fiche["videos"]), 1)
        r = self.client.delete(f"/api/v1/mes-logements/{logement_id}/videos/{fiche['videos'][0]['id']}/")
        self.assertEqual(r.status_code, 204)

        Logement.objects.filter(pk=logement_id).update(statut="publiee")
        autre = Logement.objects.create(
            proprietaire=self.proprio, titre="Autre", type_logement="villa",
            prix=1, ville="Kara", statut="publiee",
        )
        self.client.force_authenticate(None)
        r = self.client.get("/api/v1/logements/", {"ids": f"{autre.id},{logement_id}"})
        self.assertEqual(r.data["count"], 2)
        r = self.client.get("/api/v1/logements/", {"ids": str(autre.id)})
        self.assertEqual(r.data["count"], 1)
