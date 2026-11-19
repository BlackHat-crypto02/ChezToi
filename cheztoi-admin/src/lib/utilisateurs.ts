import { lireToken } from "@/lib/auth";

export type Utilisateur = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  nom_complet: string;
  phone: string;
  role: string;
  verified: boolean;
  invitation_en_attente: boolean;
  is_active: boolean;
  date_joined: string;
  city: string;
};

export type NouvelAdministrateur = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
};

type ReponseCreation = {
  message: string;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    invitation_en_attente: boolean;
  };
};

export class ErreurApi extends Error {
  statut: number;

  constructor(message: string, statut: number) {
    super(message);
    this.statut = statut;
    this.name = "ErreurApi";
  }
}

function messageErreur(donnees: unknown): string {
  if (!donnees || typeof donnees !== "object") return "";
  const objet = donnees as Record<string, unknown>;
  if (typeof objet.detail === "string") return objet.detail;

  for (const valeur of Object.values(objet)) {
    if (typeof valeur === "string") return valeur;
    if (Array.isArray(valeur) && typeof valeur[0] === "string") {
      return valeur[0];
    }
  }
  return "";
}

export async function appelApi<T>(chemin: string, options: RequestInit = {}): Promise<T> {
  const jeton = lireToken();
  const entetes = new Headers(options.headers);
  if (jeton) entetes.set("Authorization", `Bearer ${jeton}`);
  if (options.body) entetes.set("Content-Type", "application/json");

  const reponse = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}${chemin}`,
    { ...options, headers: entetes },
  );
  const donnees: unknown = await reponse.json().catch(() => null);

  if (!reponse.ok) {
    throw new ErreurApi(
      messageErreur(donnees) || "Une erreur est survenue. Réessayez.",
      reponse.status,
    );
  }
  return donnees as T;
}

export function listerUtilisateurs(): Promise<Utilisateur[]> {
  return appelApi<Utilisateur[]>("/api/v1/auth/users/");
}

export function ajouterAdministrateur(
  compte: NouvelAdministrateur,
): Promise<ReponseCreation> {
  return appelApi<ReponseCreation>("/api/v1/auth/admin/users/", {
    method: "POST",
    body: JSON.stringify(compte),
  });
}

export function renvoyerInvitation(id: number): Promise<{ message: string }> {
  return appelApi<{ message: string }>(
    `/api/v1/auth/admin/users/${id}/invitation/`,
    { method: "POST" },
  );
}

export function verifierInvitation(
  token: string,
): Promise<{ email: string; first_name: string }> {
  return appelApi<{ email: string; first_name: string }>(
    `/api/v1/auth/setup-password/?token=${encodeURIComponent(token)}`,
  );
}

export function definirMotDePasse(
  token: string,
  password: string,
  confirmation: string,
): Promise<{ message: string }> {
  return appelApi<{ message: string }>("/api/v1/auth/setup-password/", {
    method: "POST",
    body: JSON.stringify({ token, password, confirmation }),
  });
}
