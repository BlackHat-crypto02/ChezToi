import {
  RiAdvertisementLine,
  RiBox3Line,
  RiCalendarCheckLine,
  RiHome5Line,
  RiMapPinLine,
  RiShieldLine,
  RiTeamLine,
} from "@remixicon/react";

/// Les sept sections de l'administration, dans l'ordre du menu de gauche.
/// Le titre et le sous-titre sont aussi affichés dans la barre du haut.
export const entrees = [
  {
    libelle: "Tableau de bord",
    chemin: "/",
    icone: RiHome5Line,
    description: "Bienvenue sur votre tableau de bord.",
  },
  {
    libelle: "Utilisateurs",
    chemin: "/utilisateurs",
    icone: RiTeamLine,
    description:
      "La gestion des comptes locataires et propriétaires arrivera ici.",
  },
  {
    libelle: "Annonce",
    chemin: "/annonces",
    icone: RiAdvertisementLine,
    description: "Les annonces de logements seront listées ici.",
  },
  {
    libelle: "Réservations",
    chemin: "/reservations",
    icone: RiCalendarCheckLine,
    description: "Les réservations et visites à confirmer apparaîtront ici.",
  },
  {
    libelle: "Visite virtuelle",
    chemin: "/visite-virtuelle",
    icone: RiBox3Line,
    description: "Les visites 360° et 3D des logements seront gérées ici.",
  },
  {
    libelle: "Carte",
    chemin: "/carte",
    icone: RiMapPinLine,
    description: "La carte des logements disponibles sera affichée ici.",
  },
  {
    libelle: "Administrateurs",
    chemin: "/administrateur",
    icone: RiShieldLine,
    description:
      "Les comptes administrateurs et les permissions seront gérés ici.",
  },
];
