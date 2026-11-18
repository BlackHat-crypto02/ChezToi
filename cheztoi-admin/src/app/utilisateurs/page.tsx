"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RiAlertLine,
  RiCheckboxCircleLine,
  RiMailSendLine,
  RiRefreshLine,
  RiTimeLine,
  RiUserAddLine,
} from "@remixicon/react";
import FormulaireAdministrateur from "@/components/FormulaireAdministrateur";
import { effacerSession } from "@/lib/auth";
import {
  ErreurApi,
  listerUtilisateurs,
  renvoyerInvitation,
  type Utilisateur,
} from "@/lib/utilisateurs";

const libellesRoles: Record<string, string> = {
  locataire: "Locataire",
  proprietaire: "Propriétaire",
  admin: "Administrateur",
};

function formaterDate(valeur: string): string {
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function initiales(utilisateur: Utilisateur): string {
  const mots = utilisateur.nom_complet.split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "?";
  return mots
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase() ?? "")
    .join("");
}

export default function UtilisateursPage() {
  const router = useRouter();
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [renvoiEnCours, setRenvoiEnCours] = useState<number | null>(null);

  const charger = useCallback(async () => {
    try {
      const donnees = await listerUtilisateurs();
      setUtilisateurs(donnees);
    } catch (erreur) {
      if (erreur instanceof ErreurApi && [401, 403].includes(erreur.statut)) {
        effacerSession();
        router.replace("/connexion");
        return;
      }
      setErreur(
        "Impossible de charger les utilisateurs. Vérifiez que le serveur est lancé.",
      );
    } finally {
      setChargement(false);
    }
  }, [router]);

  useEffect(() => {
    // Le chargement démarre après le premier rendu (hors du corps de l'effet).
    void Promise.resolve().then(() => charger());
  }, [charger]);

  function actualiser() {
    setChargement(true);
    setErreur("");
    setMessage("");
    void charger();
  }

  async function renvoyer(id: number) {
    setRenvoiEnCours(id);
    setMessage("");
    setErreur("");
    try {
      const reponse = await renvoyerInvitation(id);
      setMessage(reponse.message);
    } catch (erreur) {
      setErreur(
        erreur instanceof ErreurApi
          ? erreur.message
          : "Impossible de renvoyer l'invitation.",
      );
    } finally {
      setRenvoiEnCours(null);
    }
  }

  return (
    <section className="page-entree">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-pri-d">Liste des utilisateurs</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {chargement
              ? "Chargement en cours..."
              : `${utilisateurs.length} compte${utilisateurs.length > 1 ? "s" : ""} enregistré${utilisateurs.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={actualiser}
            disabled={chargement}
            className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-pri transition-colors hover:border-pri hover:bg-gray-50 disabled:opacity-60"
          >
            <RiRefreshLine
              size={17}
              className={chargement ? "animate-spin" : ""}
            />
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => setFormulaireOuvert(true)}
            className="flex h-10 items-center gap-2 rounded-xl bg-pri px-4 text-sm font-bold text-white transition-colors hover:bg-pri-d"
          >
            <RiUserAddLine size={18} />
            Ajouter un administrateur
          </button>
        </div>
      </div>

      {message && (
        <div
          role="status"
          className="mb-4 flex items-start gap-2 rounded-xl border border-pri/20 bg-pri/5 px-4 py-3 text-sm text-pri-d"
        >
          <RiCheckboxCircleLine size={18} className="mt-0.5 shrink-0" />
          {message}
        </div>
      )}
      {erreur && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-700"
        >
          <RiAlertLine size={18} className="mt-0.5 shrink-0 text-pri" />
          {erreur}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {chargement && utilisateurs.length === 0 ? (
          <div className="space-y-3 px-6 py-10">
            {[0, 1, 2, 3].map((ligne) => (
              <div
                key={ligne}
                className="h-12 animate-pulse rounded-xl bg-gray-100"
              />
            ))}
          </div>
        ) : utilisateurs.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-pri">
              <RiTimeLine size={22} />
            </div>
            <p className="mt-4 text-sm font-medium text-gray-700">
              Aucun utilisateur pour le moment.
            </p>
          </div>
        ) : (
          <div className="sans-barre overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-4">Utilisateur</th>
                  <th className="px-5 py-4">Téléphone</th>
                  <th className="px-5 py-4">Rôles</th>
                  <th className="px-5 py-4">Vérification</th>
                  <th className="px-5 py-4">Statut</th>
                  <th className="px-5 py-4">Inscription</th>
                </tr>
              </thead>
              <tbody>
                {utilisateurs.map((utilisateur) => (
                  <tr
                    key={utilisateur.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pri/10 text-xs font-bold text-pri">
                          {initiales(utilisateur)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-800">
                            {utilisateur.nom_complet}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {utilisateur.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {utilisateur.phone || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-pri-d">
                        {libellesRoles[utilisateur.role] ?? utilisateur.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        {utilisateur.verified ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-pri/10 px-3 py-1 text-xs font-semibold text-pri-d">
                            <RiCheckboxCircleLine size={14} />
                            Vérifié
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
                            <RiTimeLine size={14} />
                            {utilisateur.invitation_en_attente
                              ? "Invitation en attente"
                              : "Non vérifié"}
                          </span>
                        )}
                        {utilisateur.invitation_en_attente && (
                          <button
                            type="button"
                            onClick={() => void renvoyer(utilisateur.id)}
                            disabled={renvoiEnCours === utilisateur.id}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-pri hover:text-pri-d disabled:opacity-60"
                          >
                            <RiMailSendLine size={13} />
                            {renvoiEnCours === utilisateur.id
                              ? "Envoi..."
                              : "Renvoyer l'invitation"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                          utilisateur.is_active
                            ? "bg-pri/10 text-pri-d"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            utilisateur.is_active ? "bg-pri" : "bg-gray-400"
                          }`}
                        />
                        {utilisateur.is_active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {formaterDate(utilisateur.date_joined)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formulaireOuvert && (
        <FormulaireAdministrateur
          onFermer={() => setFormulaireOuvert(false)}
          onCree={(texte) => {
            setFormulaireOuvert(false);
            setErreur("");
            setMessage(texte);
            actualiser();
          }}
        />
      )}
    </section>
  );
}
