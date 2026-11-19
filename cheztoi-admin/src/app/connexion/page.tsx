"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  RiAlertLine,
  RiArrowRightLine,
  RiEyeLine,
  RiEyeOffLine,
  RiLockPasswordLine,
  RiShieldKeyholeLine,
  RiUserLine,
} from "@remixicon/react";
import EcranAuth from "@/components/EcranAuth";
import { enregistrerSession } from "@/lib/auth";

type ReponseLogin = {
  access?: string;
  user?: { id: number; username: string; email: string; role: string };
  detail?: string;
};

const CHAMP =
  "group flex h-13 items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 px-4 text-gray-400 transition-all " +
  "focus-within:border-pri focus-within:bg-white focus-within:text-pri focus-within:shadow-[0_0_0_4px_rgba(15,118,110,0.12)]";

export default function ConnexionPage() {
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [voirMotDePasse, setVoirMotDePasse] = useState(false);
  const [majuscules, setMajuscules] = useState(false);
  const [erreur, setErreur] = useState("");
  const [secousse, setSecousse] = useState(0);
  const [chargement, setChargement] = useState(false);

  function echec(message: string) {
    setErreur(message);
    setSecousse((n) => n + 1);
  }

  function surTouche(e: KeyboardEvent<HTMLInputElement>) {
    setMajuscules(e.getModifierState("CapsLock"));
  }

  async function seConnecter(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur("");
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) {
      echec("NEXT_PUBLIC_API_URL manque : créez .env.local (voir .env.example).");
      return;
    }
    setChargement(true);

    try {
      const reponse = await fetch(`${base}/api/v1/auth/admin-login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: identifiant, password: motDePasse }),
      });
      const donnees: ReponseLogin = await reponse.json().catch(() => ({}));

      if (!reponse.ok || !donnees.access || !donnees.user) {
        echec(
          donnees.detail ??
            (reponse.status >= 500
              ? `Erreur du serveur (${reponse.status}). Pensez à python manage.py migrate.`
              : "Identifiants incorrects. Réessayez."),
        );
        return;
      }

      enregistrerSession(donnees.access, donnees.user);
      router.replace("/");
    } catch {
      echec("Impossible de joindre le serveur. Vérifiez que le backend est lancé.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <EcranAuth>
      <div className="montee-1">
        <span className="inline-flex items-center gap-2 rounded-full bg-pri/10 px-3 py-1 text-xs font-bold text-pri">
          <RiShieldKeyholeLine size={14} />
          Espace sécurisé
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          Bon retour 👋
        </h1>
        <p className="mt-2 text-gray-500">
          Connectez-vous pour accéder au tableau de bord de ChezToi.
        </p>
      </div>

      <form
        key={secousse}
        onSubmit={seConnecter}
        className={`montee-2 mt-9 space-y-5 ${secousse ? "secousse" : ""}`}
      >
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            E-mail ou nom d&apos;utilisateur
          </span>
          <span className={`mt-2 ${CHAMP}`}>
            <RiUserLine size={19} className="shrink-0" />
            <input
              type="text"
              autoComplete="username"
              autoFocus
              required
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              placeholder="uriel ou marie@exemple.tg"
              className="h-full w-full bg-transparent text-[15px] text-gray-900 outline-none placeholder:text-gray-400"
            />
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Mot de passe</span>
          <span className={`mt-2 ${CHAMP}`}>
            <RiLockPasswordLine size={19} className="shrink-0" />
            <input
              type={voirMotDePasse ? "text" : "password"}
              autoComplete="current-password"
              required
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              onKeyUp={surTouche}
              onKeyDown={surTouche}
              placeholder="••••••••"
              className="h-full w-full bg-transparent text-[15px] text-gray-900 outline-none placeholder:text-gray-400"
            />
            <button
              type="button"
              aria-label={voirMotDePasse ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              title={voirMotDePasse ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              onClick={() => setVoirMotDePasse((visible) => !visible)}
              className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:text-pri"
            >
              {voirMotDePasse ? <RiEyeOffLine size={19} /> : <RiEyeLine size={19} />}
            </button>
          </span>
          {majuscules && (
            <span className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <RiAlertLine size={14} /> Verrouillage des majuscules activé
            </span>
          )}
        </label>

        {erreur && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <RiAlertLine size={18} className="mt-0.5 shrink-0" />
            {erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={chargement}
          className="group relative flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-pri text-[15px] font-bold text-white shadow-[0_10px_30px_-10px_rgba(15,118,110,0.8)] transition-all hover:bg-pri-d hover:shadow-[0_14px_34px_-10px_rgba(15,118,110,0.9)] active:scale-[0.99] disabled:opacity-70"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          {chargement ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Connexion…
            </>
          ) : (
            <>
              Se connecter
              <RiArrowRightLine size={18} className="transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      <p className="montee-3 mt-10 text-center text-xs text-gray-400">
        Accès réservé aux administrateurs. Vous avez reçu une invitation ?
        <br />
        Utilisez le lien de l’e-mail pour choisir votre mot de passe.
      </p>
    </EcranAuth>
  );
}
