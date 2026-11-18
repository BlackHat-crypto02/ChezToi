"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RiCloseLine, RiLogoutBoxRLine } from "@remixicon/react";
import { entrees } from "@/lib/navigation";

// Les libellés n'apparaissent qu'au survol de la barre, sur grand écran.
const NOM_VISIBLE =
  "opacity-100 transition-opacity duration-200 lg:opacity-0 lg:group-hover/menu:opacity-100 motion-reduce:transition-none";

type SidebarProps = {
  ouvert: boolean;
  surFermer: () => void;
};

export default function Sidebar({ ouvert, surFermer }: SidebarProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!ouvert) return;
    function surTouche(evenement: KeyboardEvent) {
      if (evenement.key === "Escape") surFermer();
    }
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [ouvert, surFermer]);

  return (
    <>
      {ouvert && (
        <div
          onClick={surFermer}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={
          "group/menu sans-barre fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-x-hidden overflow-y-auto bg-pri px-4 py-6 " +
          "transition-transform duration-300 ease-out " +
          (ouvert ? "translate-x-0 " : "-translate-x-full ") +
          "lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-24 lg:shrink-0 lg:translate-x-0 lg:transition-[width] lg:hover:w-64"
        }
      >
        <div className="relative flex h-28 shrink-0 items-center justify-center">
          <Link
            href="/"
            onClick={surFermer}
            title="Accueil"
            aria-label="Accueil"
            className="rounded-lg transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          >
            <Image
              src="/logo-cheztoi.png"
              alt="Logo ChezToi"
              width={96}
              height={96}
              className="h-24 w-24 object-contain lg:h-16 lg:w-16 lg:transition-[width,height] lg:duration-300 lg:group-hover/menu:h-24 lg:group-hover/menu:w-24 motion-reduce:transition-none"
            />
          </Link>
          <button
            onClick={surFermer}
            aria-label="Fermer le menu"
            className="absolute right-0 rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <RiCloseLine size={20} />
          </button>
        </div>

        <nav className="mt-6 flex flex-col gap-2">
          {entrees.map((entree) => {
            const Icone = entree.icone;
            const actif =
              entree.chemin === "/"
                ? pathname === "/"
                : pathname === entree.chemin ||
                  pathname.startsWith(`${entree.chemin}/`);

            return (
              <Link
                key={entree.chemin}
                href={entree.chemin}
                onClick={surFermer}
                aria-label={entree.libelle}
                title={entree.libelle}
                className={
                  "group/entree relative flex h-12 w-full shrink-0 items-center gap-4 rounded-xl pl-5 transition-all duration-200 hover:translate-x-1 " +
                  (actif
                    ? "bg-pri-d text-white"
                    : "text-white/70 hover:bg-pri-d hover:text-white")
                }
              >
                {actif && (
                  <span className="absolute -left-4 h-6 w-1 rounded-r-full bg-white" />
                )}
                <Icone size={22} className="shrink-0" />
                <span
                  className={`text-sm font-semibold whitespace-nowrap ${NOM_VISIBLE}`}
                >
                  {entree.libelle}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* mt-auto pousse le bouton tout en bas de la colonne. L'action sera
            branchée quand l'authentification sera disponible. */}
        <button
          type="button"
          aria-label="Déconnexion"
          title="Déconnexion"
          className="group/entree mt-auto flex h-12 w-full shrink-0 items-center gap-4 rounded-xl pl-5 text-white/70 transition-all hover:translate-x-1 hover:bg-pri-d hover:text-white"
        >
          <RiLogoutBoxRLine size={22} className="shrink-0" />
          <span
            className={`text-sm font-semibold whitespace-nowrap ${NOM_VISIBLE}`}
          >
            Déconnexion
          </span>
        </button>
      </aside>
    </>
  );
}
