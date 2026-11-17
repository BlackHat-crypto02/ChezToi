# DomiLoc — Maquette interactive

Maquette cliquable de la plateforme de location immobilière décrite dans le cahier des charges :
application mobile (Flutter) pour locataires, propriétaires et agences, et administration web (Django).
HTML, CSS et JavaScript vanilla uniquement. Aucune installation : ouvrir `index.html` dans un navigateur.

## Utilisation

- **Barre du haut** : vue *Application mobile*, *Côte à côte* (mobile + admin synchronisés) ou *Administration web* ;
  choix du compte mobile ; bouton **Parcours** (scénarios guidés) ; **Réinitialiser** les données.
- Les données sont partagées entre le mobile et l'admin et conservées dans le `localStorage` du navigateur.
- Mot de passe des comptes démo : `demo1234`. Admin : `admin@domiloc.tg` / `admin1234` / code 2FA `246810`.
- Liens profonds : `index.html#view=mobile&as=u1&s=property&id=p1` · `#admin=listings&modal=listing&arg=p7`.
- Démo paiement : un numéro Mobile Money se terminant par `0000` simule un refus.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | Coque : barre de démo, cadre téléphone, navigateur admin |
| `style.css` | Tous les styles (jetons, composants, mobile, carte, 3D, admin) |
| `script.js` | Noyau : store partagé, icônes, illustrations générées, logique métier (devis, disponibilités, anti double réservation, notifications, audit, traitement 3D simulé), dispatcher d'actions |
| `js/data.js` | Données fictives cohérentes (entités du §8.4) |
| `js/mobile.js` | Navigation mobile, authentification, accueil, recherche + assistant, carte, fiche, réservation, paiement, messagerie, notifications, profil, aide |
| `js/owner.js` | Espace propriétaire/agence : tableau de bord, annonces, publication en 7 étapes, médias, disponibilités, demandes, statistiques, capture 360°/3D, agents |
| `js/tour.js` | Visionneuse 360° (cube CSS 3D, navigation entre pièces) et maquette 3D (dollhouse) |
| `js/map.js` | Carte Leaflet/OpenStreetMap (Google Maps en production), regroupement, itinéraire, repli hors ligne |
| `js/admin.js` | Administration : tableau de bord, utilisateurs, propriétaires & agences, annonces, réservations, catalogue, modération, visites, promotions, contenus, support, administrateurs, audit |

## Correspondance avec l'application réelle

- Chaque `ACT.xxx` correspond à un appel d'API (DRF) ; `S` (store) correspond aux modèles Django.
- Statuts d'annonce, de réservation et de traitement 3D identiques au cahier des charges (`js/data.js`).
- Simulations à remplacer : OTP/SMS, paiement Mobile Money/carte, messagerie temps réel (Channels/WebSocket),
  push (FCM), reconstruction 3D (service GPU), stockage S3.
