"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  RiAlertLine,
  RiCheckboxCircleLine,
  RiLockPasswordLine,
} from "@remixicon/react";
import {
  definirMotDePasse,
  ErreurApi,
  verifierInvitation,
} from "@/lib/utilisateurs";

type Etat = "verification" | "pret" | "invalide" | "termine";

export default function FormulaireSetup() {
  const parametres = useSearchParams();
  const token = parametres.get("token") ?? "";
  const [etat, setEtat] = useState<Etat>("verification");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [erreurVerification, setErreurVerification] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const verifier = useCallback(async (jeton: string) => {
    if (!jeton) {
      setErreurVerification("Aucun jeton d'invitation fourni.");
      setEtat("invalide");
      return;
    }
    try {
      const donnees = await verifierInvitation(jeton);
      setPrenom(donnees.first_name);
      setEmail(donnees.email);
      setEtat("pret");
    } catch (erreur) {
      setErreurVerification(
        erreur instanceof ErreurApi
          ? erreur.message
          : "Impossible de vérifier le lien. Réessayez.",
      );
      setEtat("invalide");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => verifier(token));
  }, [verifier, token]);

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur("");
    setEnvoi(true);
    try {
      await definirMotDePasse(token, motDePasse, confirmation);
      setEtat("termine");
    } catch (erreur) {
      setErreur(
        erreur instanceof ErreurApi
          ? erreur.message
          : "Impossible d'enregistrer le mot de passe. Réessayez.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  if (etat === "verification") {
    return <p className="text-center text-sm text-gray-500">Vérification du lien...</p>;
  }

  if (etat === "invalide") {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-pri">
          <RiAlertLine size={22} />
        </div>
        <h1 className="mt-4 text-xl font-bold text-pri-d">
          Lien d&apos;invitation invalide
        </h1>
        <p className="mt-2 text-sm text-gray-600">{erreurVerification}</p>
        <p className="mt-1 text-sm text-gray-500">
          Demandez à un administrateur de vous renvoyer une invitation.
        </p>
      </div>
    );
  }

  if (etat === "termine") {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-pri/10 text-pri">
          <RiCheckboxCircleLine size={24} />
        </div>
        <h1 className="mt-4 text-xl font-bold text-pri-d">Mot de passe enregistré</h1>
        <p className="mt-2 text-sm text-gray-600">
          Votre compte est prêt. Vous pouvez maintenant vous connecter à
          l&apos;administration ChezToi.
        </p>
        <Link
          href="/connexion"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-pri px-6 text-sm font-bold text-white transition-colors hover:bg-pri-d"
        >
          Aller à la connexion
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center">
        <h1 className="text-xl font-bold text-pri-d">Définissez votre mot de passe</h1>
        <p className="mt-2 text-sm text-gray-600">
          Bonjour {prenom}, choisissez un mot de passe pour activer votre compte{" "}
          <span className="font-semibold text-pri-d">{email}</span>.
        </p>
      </div>

      <form onSubmit={soumettre} className="mt-8 space-y-5">
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Mot de passe</span>
          <span className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 text-pri focus-within:border-pri focus-within:ring-2 focus-within:ring-pri/20">
            <RiLockPasswordLine size={18} className="shrink-0" />
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="8 caractères minimum"
              className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
            />
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            Confirmer le mot de passe
          </span>
          <span className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 text-pri focus-within:border-pri focus-within:ring-2 focus-within:ring-pri/20">
            <RiLockPasswordLine size={18} className="shrink-0" />
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="Répétez le mot de passe"
              className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
            />
          </span>
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

        <button
          type="submit"
          disabled={envoi}
          className="h-11 w-full rounded-xl bg-pri text-sm font-bold text-white transition-colors hover:bg-pri-d disabled:opacity-60"
        >
          {envoi ? "Enregistrement..." : "Enregistrer le mot de passe"}
        </button>
      </form>
    </>
  );
}
