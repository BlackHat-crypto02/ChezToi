"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { TOKEN_KEY } from "@/lib/auth";

/// Le cadre commun : menu à gauche, recherche et titre en haut, page au centre.
export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOuvert, setMenuOuvert] = useState(false);

  const pagePublique =
    pathname === "/connexion" || pathname === "/setup-mot-de-passe";

  useEffect(() => {
    if (pagePublique) return;
    if (!window.localStorage.getItem(TOKEN_KEY)) {
      router.replace("/connexion");
    }
  }, [pagePublique, router]);

  // Les pages publiques n'ont ni menu ni barre du haut.
  if (pagePublique) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-pri">
      <Sidebar
        ouvert={menuOuvert}
        surFermer={() => setMenuOuvert(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col bg-surface lg:rounded-l-4xl">
        <Topbar surMenu={() => setMenuOuvert(true)} />
        <main className="flex-1 px-4 pb-8 sm:px-6 lg:px-10 lg:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
