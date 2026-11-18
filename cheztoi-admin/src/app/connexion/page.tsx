"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  RiAlertLine,
  RiEyeLine,
  RiEyeOffLine,
  RiLockPasswordLine,
  RiUserLine,
} from "@remixicon/react";
import { enregistrerSession } from "@/lib/auth";

type ReponseLogin = {
  access?: string;
  user?: { id: number; username: string; email: string; role: string };
  detail?: string;
};

export default function ConnexionPage() {
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [voirMotDePasse, setVoirMotDePasse] = useState(false);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  async function seConnecter(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur("");
    setChargement(true);

    try {
      const reponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/admin-login/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: identifiant,
            password: motDePasse,
          }),
        },
      );
      const donnees: ReponseLogin = await reponse.json();

      if (!reponse.ok || !donnees.access || !donnees.user) {
        setErreur(
          donnees.detail ?? "Identifiants incorrects. Réessayez.",
        );
        return;
      }

      enregistrerSession(donnees.access, donnees.user);
      router.replace("/");
    } catch {
      setErreur(
        "Impossible de joindre le serveur. Vérifiez que le backend est lancé.",
      );
    } finally {
      setChargement(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-pri px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl sm:p-10">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo-cheztoi.png"
            alt="Logo ChezToi"
            width={72}
            height={72}
            className="h-18 w-18 object-contain"
            priority
          />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-pri-d">
            Administration ChezToi
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Réservé aux administrateurs
          </p>
        </div>

        <form onSubmit={seConnecter} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              E-mail ou nom d&apos;utilisateur
            </span>
            <span className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 text-pri focus-within:border-pri focus-within:ring-2 focus-within:ring-pri/20">
              <RiUserLine size={18} className="shrink-0" />
              <input
                type="text"
                autoComplete="username"
                required
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                placeholder="uriel ou marie@exemple.tg"
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Mot de passe
            </span>
            <span className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 text-pri focus-within:border-pri focus-within:ring-2 focus-within:ring-pri/20">
              <RiLockPasswordLine size={18} className="shrink-0" />
              <input
                type={voirMotDePasse ? "text" : "password"}
                autoComplete="current-password"
                required
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
              <button
                type="button"
                aria-label={
                  voirMotDePasse
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
                title={
                  voirMotDePasse
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
                onClick={() => setVoirMotDePasse((visible) => !visible)}
                className="shrink-0 text-pri"
              >
                {voirMotDePasse ? (
                  <RiEyeOffLine size={18} />
                ) : (
                  <RiEyeLine size={18} />
                )}
              </button>
            </span>
          </label>

          {erreur && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <RiAlertLine size={18} className="mt-0.5 shrink-0" />
              {erreur}
            </p>
          )}

          <button
            type="submit"
            disabled={chargement}
            className="h-11 w-full rounded-xl bg-pri text-sm font-bold text-white transition-colors hover:bg-pri-d disabled:opacity-60"
          >
            {chargement ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </main>
  );
}
