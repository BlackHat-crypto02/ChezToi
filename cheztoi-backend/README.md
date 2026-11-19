# ChezToi — Backend (Python / Django)

Backend unique pour l'application Flutter et l'administration Next.js.
Django fournit l'API REST (DRF + JWT) et le back-office `/admin/`.

## Démarrage

Le virtualenv `.venv` est déjà créé et les dépendances installées.

```bash
cd cheztoi-backend
source .venv/bin/activate          # Windows : .venv\Scripts\activate
cp .env.example .env               # à adapter si besoin
python manage.py makemigrations
python manage.py migrate
python manage.py seed_demo          # comptes, équipements et annonces de démo
python manage.py runserver 8000
```

URLs utiles :
- API : http://127.0.0.1:8000/api/v1/
- Santé : http://127.0.0.1:8000/api/v1/health/
- Admin : http://127.0.0.1:8000/admin/

Pour réinstaller les dépendances sur une autre machine :

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Endpoints disponibles

| Méthode | Route | Description | Accès |
|---|---|---|---|
| GET | `/api/v1/health/` | Vérifie que l'API répond | public |
| POST | `/api/v1/auth/register/` | Créer un compte locataire / propriétaire | public |
| POST | `/api/v1/auth/login/` | Connexion mobile (`email` ou `username`) | public |
| POST | `/api/v1/auth/admin-login/` | Connexion back-office (**admin uniquement**) | public |
| POST | `/api/v1/auth/refresh/` | Renouveler le token d'accès | public |
| GET | `/api/v1/auth/me/` | Profil connecté | connecté |
| GET | `/api/v1/auth/users/` | Liste des utilisateurs (tableau admin) | **admin uniquement** |
| POST | `/api/v1/auth/admin/users/` | Créer un administrateur + envoyer une invitation | **admin uniquement** |
| POST | `/api/v1/auth/admin/users/<id>/invitation/` | Renvoyer le lien d'invitation | **admin uniquement** |
| GET | `/api/v1/auth/setup-password/?token=...` | Vérifier un lien d'invitation | public |
| POST | `/api/v1/auth/setup-password/` | Définir le mot de passe depuis l'invitation | public |

`seed_demo` crée (ou retrouve) les comptes de démonstration :

- admin : **`uriel`** / **`2alvin2@`** (rôle `admin`, staff et superuser) ;
- propriétaire : `proprio@cheztoi.tg` / `motdepasse123` ;
- locataire : `locataire@cheztoi.tg` / `motdepasse123`.
Un compte locataire ou propriétaire reçoit une erreur **403** sur `admin-login/`.

Corps d'inscription :

```json
{
  "username": "locataire1",
  "email": "locataire1@exemple.tg",
  "password": "motdepasse123",
  "role": "locataire",
  "phone": "+228 90 00 00 00",
  "city": "Lomé"
}
```

Rôles : `locataire`, `proprietaire`, `admin`.

La liste admin renvoie pour chaque compte : `id`, `username`, `email`,
`first_name`, `last_name`, `nom_complet`, `phone`, `role`, `verified`,
`invitation_en_attente`, `is_active`, `date_joined` et `city`. Le champ
`verified` (booléen, faux par défaut) est modifiable depuis l'admin Django.
Un locataire ou propriétaire reçoit une erreur **403** sur `users/`.

### Invitation d'un administrateur (modèle Orbit)

`POST /api/v1/auth/admin/users/` crée un compte `admin` avec un mot de passe
aléatoire jamais communiqué, puis envoie un lien signé valable 24 h :

```json
{
  "first_name": "Marie",
  "last_name": "Dupont",
  "email": "marie@exemple.tg",
  "phone": "+228 90 00 00 00"
}
```

Le lien pointe vers `/setup-mot-de-passe?token=...` côté Next.js. La personne
choisit alors son mot de passe via
`POST /api/v1/auth/setup-password/` avec `token`, `password` et
`confirmation`. Le compte passe alors `verified = true`. Un e-mail déjà utilisé
donne une erreur **409**. `POST /api/v1/auth/admin/users/<id>/invitation/`
renvoie le lien. La connexion admin accepte l'e-mail ou le nom d'utilisateur.

En développement, `EMAIL_BACKEND` est `console.EmailBackend` : les e-mails
s'affichent dans la console du serveur au lieu d'être envoyés. En production,
configurer `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend` ainsi que
`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` et
`APP_BASE_URL` dans `.env`.

`username` est facultatif : s'il est absent, il est généré à partir de
l'adresse e-mail. Le rôle `admin` est refusé sur l'inscription publique.

Connexion mobile :

```json
{
  "email": "locataire1@exemple.tg",
  "password": "motdepasse123"
}
```

`username` peut remplacer `email`. La réponse contient `access`, `refresh`
et `user` (prénom, nom, rôle, téléphone, ville).

## Endpoints métier

Toutes les routes sont sous `/api/v1/`. « public » = sans jeton ; sinon
`Authorization: Bearer <access>`. Les listes de recherche sont paginées
(`count`, `next`, `results`, paramètre `taille`) ; les autres renvoient un tableau.

### Compte

| Méthode | Route | Description |
|---|---|---|
| GET / PATCH / DELETE | `auth/me/` | Profil ; PATCH accepte `first_name`, `last_name`, `phone`, `city`, `bio`, `photo` (multipart) et `role` (`locataire` ↔ `proprietaire`) ; DELETE `{password}` anonymise le compte |
| POST | `auth/change-password/` | `{ancien, nouveau}` |
| POST | `auth/password-reset/` | public, `{email}` → code à 6 chiffres par e-mail (15 min) |
| POST | `auth/password-reset/confirm/` | public, `{email, code, password}` |

### Logements (locataire / public)

| Méthode | Route | Description |
|---|---|---|
| GET | `logements/` | public, recherche : `q`, `ville`, `commune`, `quartier`, `type` (liste), `periodicite`, `prix_min/max`, `chambres_min`, `salles_de_bain_min`, `superficie_min/max`, `meuble`, `equipements` (ids), `verifie`, `visite`, `disponible_du/au`, zone `lat_min/lat_max/lng_min/lng_max`, autour `lat/lng/rayon_km` ; `tri` = `recent`, `prix_asc`, `prix_desc`, `populaire`, `note`, `proximite` |
| GET | `logements/carte/` | public, mêmes filtres, 300 marqueurs max |
| GET | `logements/accueil/` | public, sections de l'accueil (récents, populaires, recommandés, vérifiés, 360°, villes, types) |
| GET | `logements/suggestions/?q=` | public, villes / communes / quartiers |
| GET | `logements/comparer/?ids=1,2,3` | public, 2 à 4 fiches complètes |
| GET | `logements/<id>/` | public, fiche (adresse exacte et coordonnées précises seulement pour le propriétaire, un admin ou un locataire dont la réservation est acceptée) |
| GET | `logements/<id>/similaires/`, `logements/<id>/indisponibilites/`, `logements/<id>/avis/` | public |
| POST / DELETE | `logements/<id>/favori/` | ajouter / retirer un favori |
| GET | `favoris/` | favoris de l'utilisateur |
| GET / POST | `recherches/` | alertes `{nom, criteres, alerte_active}` ; PATCH / DELETE `recherches/<id>/` |
| GET | `equipements/` | public, équipements actifs |

### Espace propriétaire (rôle `proprietaire`)

| Méthode | Route | Description |
|---|---|---|
| GET / POST | `mes-logements/` | annonces (tous statuts) ; création en brouillon, `equipement_ids` pour les équipements |
| GET / PATCH / DELETE | `mes-logements/<id>/` | modification interdite si suspendue ; suppression refusée s'il existe des réservations en cours |
| POST | `mes-logements/<id>/<action>/` | `soumettre` (≥ 1 photo), `brouillon`, `archiver`, `louee`, `republier` |
| POST | `mes-logements/<id>/photos/` | multipart `image`, `legende` ; PATCH / DELETE `photos/<photo_id>/` (`legende`, `ordre`, `principale`) |
| POST | `mes-logements/<id>/panoramas/` | multipart `image`, `piece` (visite 360°) ; DELETE `panoramas/<panorama_id>/` |
| GET | `mes-logements/statistiques/` | tableau de bord |

### Réservations et avis

| Méthode | Route | Description |
|---|---|---|
| POST | `reservations/estimer/` | `{logement, date_debut, date_fin}` → montant sans créer |
| GET / POST | `reservations/` | réservations du locataire ; POST crée une demande (`en_attente`) ou une réservation `confirmee` si le logement est en réservation instantanée. Les chevauchements sont refusés |
| GET | `reservations/recues/` | demandes reçues par le propriétaire (`statut`, `logement`) |
| GET | `reservations/<id>/` | détail (locataire ou propriétaire) |
| POST | `reservations/<id>/<action>/` | `accepter` / `refuser` (propriétaire), `annuler` (les deux), `modifier` (locataire, demande en attente) ; `{motif}` facultatif |
| POST | `reservations/<id>/avis/` | locataire, séjour terminé : cinq notes de 1 à 5 + `commentaire` |
| GET | `avis/recus/` ; POST `avis/<id>/repondre/` | avis du propriétaire et réponse |

Statuts : `en_attente` → `confirmee` → `en_cours` → `terminee`, ou `refusee` /
`annulee` / `en_litige`. Ils avancent automatiquement selon la date du jour, et
une demande non traitée avant la date d'arrivée est annulée.

### Messagerie, notifications, signalements

| Méthode | Route | Description |
|---|---|---|
| GET | `conversations/` | conversations avec non-lus et dernier message |
| POST | `conversations/demarrer/` | `{logement}` (locataire) ou `{logement, destinataire}` (propriétaire), `texte` facultatif |
| GET / POST | `conversations/<id>/messages/` | `?apres=<id>` pour les nouveaux ; POST `{texte}` ou multipart `image` |
| POST / DELETE | `conversations/<id>/bloquer/` | bloquer / débloquer |
| GET | `conversations/non-lus/`, `notifications/non-lues/` | compteurs |
| GET | `notifications/` ; POST `notifications/lire/`, `notifications/<id>/lire/` | notifications |
| GET / POST | `signalements/` | `{motif, description, logement \| utilisateur \| reservation \| avis \| conversation}` ; un signalement de réservation ouvre un litige |

### Administration (rôle `admin`, préfixe `admin/`)

`statistiques/`, `logements/` (+ `<id>/`, `<id>/moderer/` avec `action` =
`valider`, `refuser`, `suspendre`, `reactiver`, `verifier`,
`retirer_verification` et `motif`), `reservations/` (+ PATCH `<id>/` `{statut}`),
`signalements/` (+ PATCH `<id>/` `{statut, decision}`), `avis/` (+ PATCH `<id>/`
`{masque}`), `equipements/` (CRUD), PATCH `utilisateurs/<id>/`
`{is_active, verified}`. La validation d'une annonce prévient les utilisateurs
dont une alerte correspond.

## Application Flutter

L'URL de l'API est dans `cheztoi/lib/config/api_config.dart` :

- émulateur Android : `http://10.0.2.2:8000` (valeur par défaut) ;
- web / bureau : `http://127.0.0.1:8000` ;
- téléphone physique : lancer avec l'IP LAN de la machine :

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.1.20:8000
```

Appel authentifié :

```
Authorization: Bearer <access>
```

## Structure

```
cheztoi-backend/
├── cheztoi/            # réglages, URLs racines
└── apps/
    ├── core/           # health check, permissions, commande seed_demo, tests de bout en bout
    ├── users/          # User, JWT, invitations admin, compte (compte.py)
    ├── logements/      # annonces, photos, panoramas, favoris, alertes ; services.py = recherche
    ├── reservations/   # réservations et avis
    ├── messagerie/     # conversations et messages
    ├── notifications/  # Notification + services.notifier()
    ├── signalements/   # signalements et litiges
    └── administration/ # API du back-office Next.js
```

Tests : `python manage.py test` (le hachage des mots de passe est accéléré
pendant les tests).
