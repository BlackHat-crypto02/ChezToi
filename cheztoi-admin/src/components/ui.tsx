"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  RiAlertLine,
  RiCheckboxCircleLine,
  RiCloseLine,
  RiInboxLine,
  RiRefreshLine,
} from "@remixicon/react";
import { effacerSession } from "@/lib/auth";
import { ErreurApi } from "@/lib/utilisateurs";

/// Charge une donnée ; renvoie vers la connexion si la session n'est plus valable.
export function useDonnees<T>(charger: () => Promise<T>, initial: T) {
  const router = useRouter();
  const [donnees, setDonnees] = useState<T>(initial);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const recharger = useCallback(async () => {
    setChargement(true);
    setErreur("");
    try {
      setDonnees(await charger());
    } catch (e) {
      if (e instanceof ErreurApi && [401, 403].includes(e.statut)) {
        effacerSession();
        router.replace("/connexion");
        return;
      }
      setErreur(
        e instanceof ErreurApi
          ? e.message
          : "Impossible de joindre le serveur. Vérifiez qu'il est lancé.",
      );
    } finally {
      setChargement(false);
    }
  }, [charger, router]);

  useEffect(() => {
    void Promise.resolve().then(() => recharger());
  }, [recharger]);

  return { donnees, setDonnees, chargement, erreur, recharger };
}

export function messageDe(e: unknown, defaut = "Une erreur est survenue."): string {
  return e instanceof ErreurApi ? e.message : defaut;
}

export function EnTete({
  titre,
  sousTitre,
  chargement,
  onActualiser,
  children,
}: {
  titre: string;
  sousTitre?: string;
  chargement?: boolean;
  onActualiser?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-pri-d">{titre}</h2>
        {sousTitre && <p className="mt-0.5 text-sm text-gray-500">{sousTitre}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {children}
        {onActualiser && (
          <button
            type="button"
            onClick={onActualiser}
            disabled={chargement}
            className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-pri transition-colors hover:border-pri hover:bg-gray-50 disabled:opacity-60"
          >
            <RiRefreshLine size={17} className={chargement ? "animate-spin" : ""} />
            Actualiser
          </button>
        )}
      </div>
    </div>
  );
}

export function Message({ texte, erreur }: { texte: string; erreur?: boolean }) {
  if (!texte) return null;
  return erreur ? (
    <div
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <RiAlertLine size={18} className="mt-0.5 shrink-0" />
      {texte}
    </div>
  ) : (
    <div
      role="status"
      className="mb-4 flex items-start gap-2 rounded-xl border border-pri/20 bg-pri/5 px-4 py-3 text-sm text-pri-d"
    >
      <RiCheckboxCircleLine size={18} className="mt-0.5 shrink-0" />
      {texte}
    </div>
  );
}

const couleurs: Record<string, string> = {
  vert: "bg-pri/10 text-pri-d",
  orange: "bg-amber-100 text-amber-800",
  rouge: "bg-red-100 text-red-700",
  bleu: "bg-blue-100 text-blue-700",
  gris: "bg-gray-100 text-gray-600",
};

const couleurParStatut: Record<string, keyof typeof couleurs> = {
  publiee: "vert",
  confirmee: "vert",
  acceptee: "vert",
  en_cours: "bleu",
  resolu: "vert",
  en_attente: "orange",
  ouvert: "orange",
  refusee: "rouge",
  suspendue: "rouge",
  annulee: "rouge",
  en_litige: "rouge",
  louee: "bleu",
  terminee: "gris",
  brouillon: "gris",
  archivee: "gris",
  rejete: "gris",
};

export function Badge({
  texte,
  couleur,
  statut,
}: {
  texte: string;
  couleur?: keyof typeof couleurs;
  statut?: string;
}) {
  const teinte = couleur ?? (statut ? couleurParStatut[statut] : undefined) ?? "gris";
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${couleurs[teinte]}`}
    >
      {texte}
    </span>
  );
}

export function Filtres({
  options,
  valeur,
  onChange,
}: {
  options: Record<string, string>;
  valeur: string;
  onChange: (valeur: string) => void;
}) {
  return (
    <div className="sans-barre mb-4 flex gap-2 overflow-x-auto">
      {Object.entries({ "": "Tous", ...options }).map(([cle, libelle]) => (
        <button
          key={cle || "tous"}
          type="button"
          onClick={() => onChange(cle)}
          className={`h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors ${
            valeur === cle
              ? "bg-pri text-white"
              : "border border-gray-200 bg-white text-gray-600 hover:border-pri hover:text-pri"
          }`}
        >
          {libelle}
        </button>
      ))}
    </div>
  );
}

export function Carte({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Squelette() {
  return (
    <div className="space-y-3 px-6 py-10">
      {[0, 1, 2, 3].map((ligne) => (
        <div key={ligne} className="h-12 animate-pulse rounded-xl bg-gray-100" />
      ))}
    </div>
  );
}

export function Vide({ texte }: { texte: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-pri">
        <RiInboxLine size={22} />
      </div>
      <p className="mt-4 text-sm font-medium text-gray-700">{texte}</p>
    </div>
  );
}

export function Modale({
  titre,
  onFermer,
  children,
  large,
}: {
  titre: string;
  onFermer: () => void;
  children: ReactNode;
  large?: boolean;
}) {
  useEffect(() => {
    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") onFermer();
    }
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFermer]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/40 px-4 py-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFermer();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        className={`sans-barre max-h-full w-full overflow-y-auto rounded-2xl bg-white shadow-xl ${
          large ? "max-w-4xl" : "max-w-lg"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h3 className="text-base font-bold text-pri-d">{titre}</h3>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <RiCloseLine size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Bouton({
  children,
  onClick,
  variante = "principal",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variante?: "principal" | "secondaire" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const styles = {
    principal: "bg-pri text-white hover:bg-pri-d",
    secondaire: "border border-gray-200 bg-white text-pri hover:border-pri hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors disabled:opacity-60 ${styles[variante]}`}
    >
      {children}
    </button>
  );
}

/// Image servie par Django (`/media/...`) : balise simple, sans optimisation Next.
export function ImageDistante({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return <div className={`bg-gray-100 ${className ?? ""}`} aria-label={alt} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`object-cover ${className ?? ""}`} />;
}
