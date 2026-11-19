import type { ReactNode } from "react";
import Image from "next/image";
import { RiCalendarCheckLine, RiMapPin2Line, RiShieldCheckLine } from "@remixicon/react";

/// Maison tracée trait par trait, puis épingle ChezToi qui tombe sur le toit
/// (même animation que l'écran de démarrage de l'application mobile).
function MaisonAnimee() {
  return (
    <div className="relative mx-auto h-40 w-40">
      <div className="absolute inset-4 rounded-full bg-[#5eead4]/25 blur-3xl" />
      <svg viewBox="0 0 140 140" className="relative h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="remplissage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
        </defs>
        <g className="maison-remplie">
          <path d="M28 129 L28 67 L70 28 L112 67 L112 129 Z" fill="url(#remplissage)" />
          <path d="M59 129 L59 98 A11 11 0 0 1 81 98 L81 129 Z" fill="#053b37" />
        </g>
        <g
          fill="none"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path className="maison-trace" pathLength={1} d="M28 129 L28 67 L70 28 L112 67 L112 129 Z" />
          <path className="maison-trace" pathLength={1} d="M92 49 L92 31 L102 31 L102 59" />
          <path className="maison-trace" pathLength={1} d="M59 129 L59 98 A11 11 0 0 1 81 98 L81 129" />
        </g>
      </svg>
      <span className="epingle-chute absolute -top-4 left-1/2 -ml-[22px] flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white bg-amber-500 shadow-[0_6px_20px_rgba(245,158,11,0.55)]">
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden="true">
          <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.6 5c2.1 0 3.6 1.2 4.4 2.5C11.8 6.2 13.3 5 15.4 5 19 5 21.1 8.4 19.6 11.8 17.5 16.4 12 21 12 21z" />
        </svg>
      </span>
    </div>
  );
}

function CarteFlottante({
  className,
  icone,
  titre,
  texte,
}: {
  className: string;
  icone: ReactNode;
  titre: string;
  texte: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white shadow-2xl backdrop-blur-md ${className}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[#5eead4]">
        {icone}
      </span>
      <span>
        <span className="block text-sm font-bold">{titre}</span>
        <span className="block text-xs text-white/70">{texte}</span>
      </span>
    </div>
  );
}

/// Mise en page des écrans d'authentification de l'administration :
/// panneau de marque animé à gauche, formulaire à droite.
export default function EcranAuth({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-white lg:flex-row">
      {/* Panneau de marque */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#0a4f49] via-[#053b37] to-[#021e1c] px-6 py-10 text-white lg:flex lg:w-[52%] lg:flex-col lg:justify-between lg:px-14 lg:py-12">
        <div className="motif-points absolute inset-0 -z-10" />
        <div className="aurore-1 absolute -left-24 -top-24 -z-10 h-96 w-96 rounded-full bg-teal-400/30 blur-3xl" />
        <div className="aurore-2 absolute -bottom-32 right-0 -z-10 h-[28rem] w-[28rem] rounded-full bg-[#5eead4]/20 blur-3xl" />

        <div className="montee-1 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white p-1.5">
            <Image src="/logo-cheztoi.png" alt="" width={36} height={36} priority />
          </span>
          <span className="text-xl font-extrabold tracking-tight">
            Chez<span className="text-[#5eead4]">Toi</span>
            <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 align-middle text-[11px] font-semibold tracking-wide text-white/80">
              ADMIN
            </span>
          </span>
        </div>

        <div className="mt-10 hidden lg:block">
          <MaisonAnimee />
          <h2 className="montee-2 mx-auto mt-10 max-w-md text-center text-4xl font-extrabold leading-tight tracking-tight">
            Pilotez la confiance de toute la plateforme.
          </h2>
          <p className="montee-3 mx-auto mt-4 max-w-md text-center text-base text-white/70">
            Validez les annonces, accompagnez les propriétaires et gardez un œil
            sur chaque réservation, en temps réel.
          </p>
        </div>

        <div className="relative mt-10 hidden h-44 lg:block">
          <CarteFlottante
            className="flotte-1 absolute left-0 top-0"
            icone={<RiShieldCheckLine size={20} />}
            titre="Modération"
            texte="Annonces vérifiées avant publication"
          />
          <CarteFlottante
            className="flotte-2 absolute right-0 top-10"
            icone={<RiCalendarCheckLine size={20} />}
            titre="Réservations"
            texte="Litiges arbitrés en un clic"
          />
          <CarteFlottante
            className="flotte-3 absolute bottom-0 left-16"
            icone={<RiMapPin2Line size={20} />}
            titre="Carte"
            texte="Tous les logements, au Togo"
          />
        </div>

        <p className="mt-6 hidden text-xs text-white/50 lg:block">
          © ChezToi · Espace d’administration
        </p>
      </section>

      {/* Formulaire */}
      <section className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
