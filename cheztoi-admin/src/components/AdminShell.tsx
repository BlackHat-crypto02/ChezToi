"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

/// Le cadre commun : menu à gauche, recherche et logo en haut, page au centre.
export default function AdminShell({ children }: { children: ReactNode }) {
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <div className="flex min-h-screen bg-pri">
      <Sidebar
        ouvert={menuOuvert}
        surFermer={() => setMenuOuvert(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col bg-surface lg:rounded-l-4xl">
        <Topbar surMenu={() => setMenuOuvert(true)} />
        <main className="flex-1 px-4 pb-8 sm:px-6 lg:px-10 lg:pb-10">{children}</main>
      </div>
    </div>
  );
}
