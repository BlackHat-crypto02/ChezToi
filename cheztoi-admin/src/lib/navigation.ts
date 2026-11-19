import {
  RiAdvertisementLine,
  RiBox3Line,
  RiCalendarCheckLine,
  RiFlagLine,
  RiHome5Line,
  RiMapPinLine,
  RiShieldCheckLine,
  RiShieldLine,
  RiStarLine,
  RiTeamLine,
  RiToolsLine,
} from "@remixicon/react";

/// Les sections de l'administration, dans l'ordre du menu de gauche.
/// Le titre et le sous-titre sont aussi affichés dans la barre du haut.
export const entrees = [
  {
    libelle: "Tableau de bord",
    chemin: "/",
    icone: RiHome5Line,
    description: "Vue d’ensemble de l’activité de la plateforme.",
  },
  {
    libelle: "Utilisateurs",
    chemin: "/utilisateurs",
    icone: RiTeamLine,
    description: "Consultez les comptes locataires, propriétaires et administrateurs.",
  },
  {
    libelle: "Annonces",
    chemin: "/annonces",
    icone: RiAdvertisementLine,
    description: "Validez, refusez ou suspendez les annonces des propriétaires.",
  },
  {
    libelle: "Réservations",
    chemin: "/reservations",
    icone: RiCalendarCheckLine,
    description: "Suivez les réservations et arbitrez les litiges.",
  },
  {
    libelle: "Visite virtuelle",
    chemin: "/visite-virtuelle",
    icone: RiBox3Line,
    description: "Consultez les visites 360° envoyées par les propriétaires.",
  },
  {
    libelle: "Carte",
    chemin: "/carte",
    icone: RiMapPinLine,
    description: "Tous les logements géolocalisés, par statut.",
  },
  {
    libelle: "Vérifications",
    chemin: "/verifications",
    icone: RiShieldCheckLine,
    description: "Examinez les justificatifs envoyés par les propriétaires.",
  },
  {
    libelle: "Signalements",
    chemin: "/signalements",
    icone: RiFlagLine,
    description: "Traitez les signalements et litiges des utilisateurs.",
  },
  {
    libelle: "Avis",
    chemin: "/avis",
    icone: RiStarLine,
    description: "Modérez les avis laissés après les séjours.",
  },
  {
    libelle: "Équipements",
    chemin: "/equipements",
    icone: RiToolsLine,
    description: "Gérez la liste des équipements proposés aux propriétaires.",
  },
  {
    libelle: "Administrateurs",
    chemin: "/administrateur",
    icone: RiShieldLine,
    description:
      "Les comptes administrateurs et les permissions seront gérés ici.",
  },
];
