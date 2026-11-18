# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Vue d'ensemble

ChezToi : plateforme de location immobilière (spécification dans `cahier des charge.txt`, maquette dans `maquette.html`). Monorepo de trois applications qui parlent toutes au même backend Django ; le code et les messages d'interface sont en **français** (noms de classes, variables, erreurs API incluses).

- `cheztoi/` — app mobile/web Flutter (locataires, propriétaires). Seul le rôle locataire a une navigation branchée dans `main.dart` ; `views/proprietaire/` existe mais n'est pas encore ouvert depuis l'écran de connexion.
- `cheztoi-admin/` — back-office Next.js 16 / React 19 / Tailwind 4 (administrateurs uniquement).
- `cheztoi-backend/` — Django 6 + DRF + SimpleJWT. API sous `/api/v1/`, back-office Django sous `/admin/`. SQLite par défaut ; Postgres via variables `DB_*` du `.env`.

## Commandes

Backend (`cheztoi-backend/`, virtualenv `.venv`) :
```bash
source .venv/bin/activate
cp .env.example .env
python manage.py migrate
python manage.py runserver 8000
python manage.py test                       # tous les tests
python manage.py test apps.users.tests      # un module
```

Flutter (`cheztoi/`) :
```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://IP_MACHINE:8000   # téléphone physique
flutter test                                # tous les tests
flutter test test/auth_service_test.dart    # un fichier
flutter analyze
```
URL de l'API par défaut (`lib/config/api_config.dart`) : `10.0.2.2:8000` sur émulateur Android, `127.0.0.1:8000` sur web.

Admin (`cheztoi-admin/`) : `npm run dev`, `npm run build`, `npm run lint`. Nécessite `NEXT_PUBLIC_API_URL` (ex. `http://127.0.0.1:8000`) dans `.env.local`.
`cheztoi-admin/AGENTS.md` avertit que cette version de Next.js diffère de ce que tu connais : lis `node_modules/next/dist/docs/` avant d'écrire du code Next.

## Architecture

**Authentification (transverse aux trois projets).** JWT `access`/`refresh` émis par le backend (`apps/users`). Deux points d'entrée distincts : `auth/login/` (mobile, `email` ou `username`) et `auth/admin-login/` (refuse tout rôle non-admin avec 403). Rôles : `locataire`, `proprietaire`, `admin` ; `admin` est refusé à l'inscription publique. Les administrateurs sont créés par invitation (`auth/admin/users/`) : mot de passe aléatoire non communiqué + lien signé de 24 h vers `/setup-mot-de-passe?token=...` côté Next.js ; en dev les e-mails s'affichent dans la console du serveur (`console.EmailBackend`). La liste complète des endpoints et corps JSON est dans `cheztoi-backend/README.md` — à mettre à jour quand une route change.

**Flutter.** `lib/main.dart` décide de l'écran initial (session persistée → `NavigationLocataire`, sinon `Connection`) et expose un `navigateurChezToi` global pour remplacer la pile depuis les callbacks d'auth (`onAuthentifie`, `onDeconnexion`). `lib/services/auth_service.dart` encapsule HTTP + `shared_preferences` (tokens et utilisateur) et lève `ApiException` avec un message déjà traduit ; `AuthService` accepte un `http.Client`/`SharedPreferences` injectés pour les tests. Les écrans sont rangés par rôle : `views/<role>/navigation_*.dart` + onglets. Les styles partagés sont dans `lib/widget/styles.dart`. UI via le paquet `material_ui`.

**Admin Next.js.** App Router (`src/app/<section>/page.tsx`), enveloppe commune `components/AdminShell` (Sidebar + Topbar), navigation déclarée dans `lib/navigation.ts`. Le token est stocké en `localStorage` (`lib/auth.ts`) ; les appels API passent par `lib/utilisateurs.ts`. Plusieurs sections (annonces, carte, réservations, visite virtuelle) ne sont encore que des `PagePlaceholder`.
