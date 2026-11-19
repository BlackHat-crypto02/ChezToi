import { appelApi } from "@/lib/utilisateurs";

// ------------------------------------------------------------------ Types

export type Equipement = { id: number; nom: string; icone: string; actif: boolean };

export type Photo = {
  id: number;
  image: string;
  legende: string;
  ordre: number;
  principale: boolean;
};

export type Panorama = { id: number; image: string; piece: string; ordre: number };

export type Logement = {
  id: number;
  titre: string;
  description: string;
  type_logement: string;
  meuble: boolean;
  chambres: number;
  salons: number;
  salles_de_bain: number;
  toilettes: number;
  superficie: number | null;
  capacite: number | null;
  prix: number;
  devise: string;
  periodicite: string;
  caution: number;
  avance: number;
  frais_supplementaires: number;
  charges: number;
  conditions_paiement: string;
  conditions_annulation: string;
  reservation_instantanee: boolean;
  region: string;
  ville: string;
  commune: string;
  quartier: string;
  adresse: string;
  latitude: number | null;
  longitude: number | null;
  photo: string | null;
  photos: Photo[];
  panoramas: Panorama[];
  equipements: Equipement[];
  verifie: boolean;
  statut: string;
  motif_refus: string;
  a_visite_virtuelle: boolean;
  note_moyenne: number | null;
  nombre_avis: number;
  nombre_vues: number;
  nombre_signalements: number;
  proprietaire: {
    id: number;
    nom_complet: string;
    email: string;
    phone: string;
    verified: boolean;
  };
  publie_le: string | null;
  cree_le: string;
  modifie_le: string;
};

export type UtilisateurPublic = {
  id: number;
  nom_complet: string;
  city: string;
  verified: boolean;
};

export type Reservation = {
  id: number;
  logement: Pick<Logement, "id" | "titre" | "ville" | "quartier" | "photo" | "devise">;
  locataire: UtilisateurPublic;
  proprietaire: UtilisateurPublic;
  date_debut: string;
  date_fin: string;
  nombre_personnes: number;
  message: string;
  periodes: number;
  montant_location: number;
  caution: number;
  avance: number;
  frais: number;
  montant_total: number;
  statut: string;
  motif: string;
  cree_le: string;
};

export type Signalement = {
  id: number;
  motif: string;
  motif_libelle: string;
  description: string;
  piece_jointe: string | null;
  logement: number | null;
  utilisateur: number | null;
  reservation: number | null;
  avis: number | null;
  conversation: number | null;
  cible: string;
  resume_cible: string;
  statut: string;
  statut_libelle: string;
  decision: string;
  auteur: UtilisateurPublic;
  cree_le: string;
};

export type Avis = {
  id: number;
  reservation: number;
  logement: number;
  auteur: UtilisateurPublic;
  note_etat: number;
  note_conformite: number;
  note_proprete: number;
  note_communication: number;
  note_qualite_prix: number;
  note_globale: number;
  commentaire: string;
  reponse_proprietaire: string;
  masque: boolean;
  cree_le: string;
};

export type Statistiques = {
  utilisateurs_total: number;
  locataires: number;
  proprietaires: number;
  administrateurs: number;
  logements_total: number;
  logements_par_statut: Record<string, number>;
  annonces_publiees: number;
  annonces_en_attente: number;
  reservations_total: number;
  reservations_par_statut: Record<string, number>;
  signalements_ouverts: number;
  litiges: number;
  volume_reservations: number;
  inscriptions_30j: { jour: string; total: number }[];
  reservations_30j: { jour: string; total: number }[];
  villes: { ville: string; total: number }[];
};

// -------------------------------------------------------------- Libellés

export const statutsLogement: Record<string, string> = {
  brouillon: "Brouillon",
  en_attente: "En attente",
  publiee: "Publiée",
  refusee: "Refusée",
  suspendue: "Suspendue",
  louee: "Louée",
  archivee: "Archivée",
};

export const statutsReservation: Record<string, string> = {
  en_attente: "En attente",
  acceptee: "Acceptée",
  refusee: "Refusée",
  confirmee: "Confirmée",
  en_cours: "En cours",
  terminee: "Terminée",
  annulee: "Annulée",
  en_litige: "En litige",
};

export const statutsSignalement: Record<string, string> = {
  ouvert: "Ouvert",
  en_cours: "En cours",
  resolu: "Résolu",
  rejete: "Rejeté",
};

export const typesLogement: Record<string, string> = {
  maison: "Maison",
  appartement: "Appartement",
  studio: "Studio",
  chambre: "Chambre",
  villa: "Villa",
  duplex: "Duplex",
};

export const periodicites: Record<string, string> = {
  nuit: "nuit",
  semaine: "semaine",
  mois: "mois",
  annee: "an",
};

export function formaterPrix(montant: number, devise = "XOF"): string {
  const nombre = new Intl.NumberFormat("fr-FR").format(montant);
  return `${nombre} ${devise === "XOF" ? "FCFA" : devise}`;
}

export function formaterDate(valeur: string | null | undefined): string {
  if (!valeur) return "—";
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function requete(parametres: Record<string, string | undefined>): string {
  const recherche = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(parametres)) {
    if (valeur) recherche.set(cle, valeur);
  }
  const texte = recherche.toString();
  return texte ? `?${texte}` : "";
}

// ---------------------------------------------------------------- Appels

const BASE = "/api/v1/admin";

export const lireStatistiques = () =>
  appelApi<Statistiques>(`${BASE}/statistiques/`);

export const listerLogements = (filtres: {
  statut?: string;
  q?: string;
  geolocalises?: boolean;
} = {}) =>
  appelApi<Logement[]>(
    `${BASE}/logements/${requete({
      statut: filtres.statut,
      q: filtres.q,
      geolocalises: filtres.geolocalises ? "1" : undefined,
    })}`,
  );

export const lireLogement = (id: number) =>
  appelApi<Logement>(`${BASE}/logements/${id}/`);

export const modererLogement = (
  id: number,
  action:
    | "valider"
    | "refuser"
    | "suspendre"
    | "reactiver"
    | "verifier"
    | "retirer_verification",
  motif = "",
) =>
  appelApi<Logement>(`${BASE}/logements/${id}/moderer/`, {
    method: "POST",
    body: JSON.stringify({ action, motif }),
  });

export const listerReservations = (filtres: { statut?: string; q?: string } = {}) =>
  appelApi<Reservation[]>(`${BASE}/reservations/${requete(filtres)}`);

export const changerStatutReservation = (id: number, statut: string, motif = "") =>
  appelApi<Reservation>(`${BASE}/reservations/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ statut, motif }),
  });

export const listerSignalements = (statut?: string) =>
  appelApi<Signalement[]>(`${BASE}/signalements/${requete({ statut })}`);

export const traiterSignalement = (id: number, statut: string, decision: string) =>
  appelApi<Signalement>(`${BASE}/signalements/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ statut, decision }),
  });

export const listerAvis = () => appelApi<Avis[]>(`${BASE}/avis/`);

export const masquerAvis = (id: number, masque: boolean) =>
  appelApi<Avis>(`${BASE}/avis/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ masque }),
  });

export const listerEquipements = () => appelApi<Equipement[]>(`${BASE}/equipements/`);

export const creerEquipement = (nom: string, icone = "") =>
  appelApi<Equipement>(`${BASE}/equipements/`, {
    method: "POST",
    body: JSON.stringify({ nom, icone, actif: true }),
  });

export const modifierEquipement = (id: number, champs: Partial<Equipement>) =>
  appelApi<Equipement>(`${BASE}/equipements/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(champs),
  });

export const supprimerEquipement = (id: number) =>
  appelApi<null>(`${BASE}/equipements/${id}/`, { method: "DELETE" });

export const modifierUtilisateur = (
  id: number,
  champs: { is_active?: boolean; verified?: boolean },
) =>
  appelApi<unknown>(`${BASE}/utilisateurs/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(champs),
  });
