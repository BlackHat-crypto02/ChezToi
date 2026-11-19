# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Vue d'ensemble

ChezToi : plateforme de location immobilière (spécification dans `cahier des charge.txt`, maquette dans `maquette.html` — l'interface réelle s'en écarte volontairement). Monorepo de trois applications qui parlent toutes au même backend Django ; le code et les messages d'interface sont en **français** (noms de classes, variables, erreurs API incluses).

- `cheztoi/` — app mobile/web Flutter : espace locataire et espace propriétaire, choisis selon le rôle.
- `cheztoi-admin/` — back-office Next.js 16 / React 19 / Tailwind 4 (administrateurs uniquement).
- `cheztoi-backend/` — Django 6 + DRF + SimpleJWT. API sous `/api/v1/`, back-office Django sous `/admin/`. SQLite par défaut ; Postgres via variables `DB_*` du `.env`.

## Commandes

Backend (`cheztoi-backend/`, virtualenv `.venv`, `pip install -r requirements.txt`) :
```bash
source .venv/bin/activate
cp .env.example .env
python manage.py migrate
python manage.py seed_demo                  # comptes uriel/2alvin2@, proprio@ et locataire@cheztoi.tg (motdepasse123), annonces
python manage.py runserver 8000
python manage.py test                       # tous les tests
python manage.py test apps.core.tests       # un module (parcours de bout en bout)
```
`db.sqlite3` et `media/` ne sont pas versionnés : relancer `seed_demo` sur une nouvelle machine.

Flutter (`cheztoi/`, SDK dans `~/development/flutter`) :
```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://IP_MACHINE:8000   # téléphone physique
flutter test                                # tous les tests
flutter test test/widget_test.dart          # un fichier
flutter analyze
```
URL de l'API par défaut (`lib/config/api_config.dart`) : `10.0.2.2:8000` sur émulateur Android, `127.0.0.1:8000` sur web.

Admin (`cheztoi-admin/`) : `npm run dev`, `npm run build`, `npm run lint`. Nécessite `NEXT_PUBLIC_API_URL` (ex. `http://127.0.0.1:8000`) dans `.env.local`.
`cheztoi-admin/AGENTS.md` avertit que cette version de Next.js diffère de ce que tu connais : lis `node_modules/next/dist/docs/` avant d'écrire du code Next.

## Architecture

**Authentification (transverse).** JWT `access`/`refresh` émis par `apps/users`. Deux points d'entrée : `auth/login/` (mobile, `email` ou `username`) et `auth/admin-login/` (403 pour tout rôle non-admin). Rôles : `locataire`, `proprietaire`, `admin` ; un utilisateur bascule lui-même entre locataire et propriétaire via `PATCH auth/me/`, jamais vers `admin`. Les administrateurs sont créés par invitation (lien signé 24 h vers `/setup-mot-de-passe` côté Next.js) ; en dev les e-mails (invitations, codes de réinitialisation) s'affichent dans la console du serveur. La liste complète des endpoints est dans `cheztoi-backend/README.md` — à mettre à jour quand une route change.

**Backend.** Une app par domaine (`logements`, `reservations` (+ avis), `messagerie`, `notifications`, `signalements`, `administration` = API du back-office). Points à connaître :
- `apps/logements/services.py` : `filtrer()` (tous les filtres de recherche, réutilisé pour les alertes : une `RechercheEnregistree` stocke ses critères au même format que les query params), `annoter()` (note moyenne, favori, 360°), `notifier_alertes()` appelée à la première validation d'une annonce.
- Seules les annonces `publiee` sont publiques ; le propriétaire soumet (`en_attente`), l'admin valide/refuse/suspend. L'adresse exacte et les coordonnées précises ne sont visibles que du propriétaire, d'un admin ou d'un locataire dont la réservation est acceptée (sinon arrondies à ~100 m).
- `Reservation.BLOQUANTS` + `chevauchements()` empêchent les doubles réservations ; `reservations/services.actualiser_statuts()` fait avancer les statuts selon la date et est appelée en tête des listes.
- Toute notification passe par `apps.notifications.services.notifier()`.
- Permissions partagées dans `apps/core/permissions.py` (`EstAdministrateur`, `EstProprietaire`).

**Flutter.** `lib/main.dart` installe `ChezToiApi.instance`, remplit `Session.utilisateur` et ouvre `NavigationLocataire` ou `NavigationProprietaire` selon le rôle ; `navigateurChezToi` permet de remplacer la pile depuis les callbacks (`onAuthentifie`, `onDeconnexion`, `onChangementRole`). Couches :
- `services/auth_service.dart` (connexion, session `shared_preferences`, refresh) → `services/api_client.dart` (jeton, renouvellement sur 401, `ApiException`, multipart via `FichierEnvoi`) → `services/chez_toi_api.dart` (un appel par endpoint, renvoie les modèles de `models/modeles.dart`).
- Écrans : `views/locataire/`, `views/proprietaire/`, et `views/commun/` pour ce qui sert aux deux rôles (fiche logement, chat, réservations, profil, notifications, carte, panorama). Widgets et formats partagés (`formatPrix`, `Chargeur`, `LogementCarte`, `BoutonFavori`…) dans `widget/commun.dart`, couleurs dans `widget/styles.dart`. UI via le paquet `material_ui` (il exporte aussi les localisations : ne pas importer `flutter_localizations`).
- Cartes : `flutter_map` + tuiles OpenStreetMap (pas de clé Google). Messagerie en polling (4 s), pas de WebSocket.
- Tests : `test/fausse_api.dart` installe une `ChezToiApi` sur un `MockClient` qui répond par chemin ; l'utiliser pour tout widget qui appelle l'API.

**Admin Next.js.** App Router, pages client (`"use client"`) dans `src/app/<section>/page.tsx`, enveloppe `components/AdminShell` (Sidebar + Topbar), menu déclaré dans `lib/navigation.ts`. Le token est en `localStorage` (`lib/auth.ts`) ; `appelApi` est dans `lib/utilisateurs.ts`, les appels et types du back-office dans `lib/admin.ts`. `components/ui.tsx` fournit `useDonnees` (chargement + redirection vers `/connexion` sur 401/403) et les briques visuelles (Badge, Modale, Filtres…). Leaflet (`components/CarteLogements.tsx`) est chargé avec `next/dynamic` `ssr: false`. Les images Django sont affichées via `ImageDistante` (balise `img`, pas `next/image`).
