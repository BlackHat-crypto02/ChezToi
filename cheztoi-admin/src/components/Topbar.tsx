"use client";

import { usePathname } from "next/navigation";
import { RiMenuLine, RiSearchLine } from "@remixicon/react";
import { entrees } from "@/lib/navigation";

type TopbarProps = {
  surMenu: () => void;
};

export default function Topbar({ surMenu }: TopbarProps) {
  const pathname = usePathname();
  const courante =
    entrees.find((entree) =>
      entree.chemin === "/"
        ? pathname === "/"
        : pathname === entree.chemin ||
          pathname.startsWith(`${entree.chemin}/`),
    ) ?? entrees[0];

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 bg-surface/85 px-4 pt-5 pb-4 backdrop-blur sm:px-6 lg:rounded-tl-4xl lg:px-10 lg:pt-8 lg:pb-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          onClick={surMenu}
          aria-label="Ouvrir le menu"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50 text-pri hover:bg-gray-100 lg:hidden"
        >
          <RiMenuLine size={20} />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold tracking-tight text-pri-d sm:text-2xl">
            {courante.libelle}
          </h1>
          <p className="mt-0.5 truncate text-sm text-gray-500">
            {courante.description}
          </p>
        </div>
      </div>

      <label className="flex h-10 w-full shrink-0 items-center gap-2 rounded-full bg-gray-50 px-4 text-pri focus-within:ring-2 focus-within:ring-pri/30 sm:w-auto sm:max-w-sm">
        <RiSearchLine size={18} className="shrink-0" />
        <input
          type="search"
          placeholder="Rechercher un bien, un utilisateur..."
          aria-label="Rechercher"
          className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
      </label>
    </header>
  );
}
