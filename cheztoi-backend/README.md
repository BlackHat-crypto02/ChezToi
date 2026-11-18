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
python manage.py createsuperuser   # pour accéder à /admin/
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

Compte administrateur fictif en base : **`uriel`** / **`2alvin2@`** (rôle `admin`, staff et superuser).
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
├── manage.py
├── requirements.txt
├── .env.example
├── cheztoi/          # réglages du projet, URLs racines
│   ├── settings.py
│   └── urls.py
└── apps/
    ├── core/         # health check
    └── users/        # modèle User, inscription, JWT, profil
```

## Étapes suivantes

Ajouter les applications métier avec la même structure que `apps/users` :

```bash
python manage.py startapp annonces apps/annonces
python manage.py startapp reservations apps/reservations
python manage.py startapp visites apps/visites
```

Puis les enregistrer dans `INSTALLED_APPS` et brancher leurs routes dans
`cheztoi/urls.py` sous `api/v1/`.
