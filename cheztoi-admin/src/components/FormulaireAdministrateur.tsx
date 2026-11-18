"use client";

import { useState, type FormEvent } from "react";
import { RiAlertLine, RiCloseLine, RiMailLine } from "@remixicon/react";
import { ajouterAdministrateur, ErreurApi } from "@/lib/utilisateurs";

type FormulaireAdministrateurProps = {
  onFermer: () => void;
  onCree: (message: string) => void;
};

export default function FormulaireAdministrateur({
  onFermer,
  onCree,
}: FormulaireAdministrateurProps) {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur("");
    setEnvoi(true);

    try {
      const reponse = await ajouterAdministrateur({
        first_name: prenom.trim(),
        last_name: nom.trim(),
        email: email.trim(),
        phone: telephone.trim(),
      });
      onCree(
        `Compte créé pour ${reponse.user.first_name} ${reponse.user.last_name}. ` +
          `Une invitation a été envoyée à ${reponse.user.email}.`,
      );
    } catch (erreur) {
      setErreur(
        erreur instanceof ErreurApi
          ? erreur.message
          : "Impossible de joindre le serveur. Réessayez.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/40 px-4 py-6"
      role="presentation"
      onMouseDown={(evenement) => {
        if (evenement.target === evenement.currentTarget && !envoi) onFermer();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-ajout-admin"
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div>
            <h2 id="titre-ajout-admin" className="text-lg font-bold text-pri-d">
              Nouvel administrateur
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Le compte sera créé et une invitation sera envoyée par e-mail.
            </p>
          </div>
          <button
            type="button"
            onClick={onFermer}
            disabled={envoi}
            aria-label="Fermer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-pri disabled:opacity-50"
          >
            <RiCloseLine size={20} />
          </button>
        </div>

        <form onSubmit={soumettre} className="space-y-4 px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">Prénom</span>
              <input
                type="text"
                required
                autoFocus
                autoComplete="given-name"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Marie"
                className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 outline-none focus:border-pri focus:ring-2 focus:ring-pri/20"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">Nom</span>
              <input
                type="text"
                required
                autoComplete="family-name"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Dupont"
                className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 outline-none focus:border-pri focus:ring-2 focus:ring-pri/20"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700">E-mail</span>
            <span className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 text-pri focus-within:border-pri focus-within:ring-2 focus-within:ring-pri/20">
              <RiMailLine size={18} className="shrink-0" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="marie@exemple.tg"
                className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
              />
            </span>
            <span className="mt-2 block text-xs text-gray-500">
              Un e-mail d&apos;invitation est envoyé à cette adresse : la personne
              y choisit son mot de passe (lien valable 24 heures).
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Téléphone <span className="font-normal text-gray-400">(facultatif)</span>
            </span>
            <input
              type="tel"
              autoComplete="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="+228 90 00 00 00"
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 outline-none focus:border-pri focus:ring-2 focus:ring-pri/20"
            />
          </label>

          {erreur && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-700"
            >
              <RiAlertLine size={18} className="mt-0.5 shrink-0 text-pri" />
              {erreur}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={onFermer}
              disabled={envoi}
              className="h-11 rounded-xl px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-60"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={envoi}
              className="h-11 rounded-xl bg-pri px-5 text-sm font-bold text-white transition-colors hover:bg-pri-d disabled:opacity-60"
            >
              {envoi ? "Envoi de l'invitation..." : "Créer et inviter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
