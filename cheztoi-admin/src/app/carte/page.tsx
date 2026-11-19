"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Carte, EnTete, Filtres, Message, useDonnees } from "@/components/ui";
import { listerLogements, statutsLogement, type Logement } from "@/lib/admin";

// Leaflet manipule `window` : chargé uniquement côté navigateur.
const CarteLogements = dynamic(() => import("@/components/CarteLogements"), {
  ssr: false,
  loading: () => <div className="h-[70vh] min-h-96 animate-pulse rounded-2xl bg-gray-100" />,
});

const legende: [string, string][] = [
  ["#0f766e", "Publiée"],
  ["#d97706", "En attente"],
  ["#2563eb", "Louée"],
  ["#dc2626", "Refusée / suspendue"],
  ["#6b7280", "Autre"],
];

export default function CartePage() {
  const router = useRouter();
  const [statut, setStatut] = useState("");
  const charger = useCallback(
    () => listerLogements({ statut, geolocalises: true }),
    [statut],
  );
  const { donnees, chargement, erreur, recharger } = useDonnees(charger, [] as Logement[]);

  return (
    <section className="page-entree">
      <EnTete
        titre="Carte des logements"
        sousTitre={chargement ? "Chargement en cours..." : `${donnees.length} logement(s) géolocalisé(s)`}
        chargement={chargement}
        onActualiser={() => void recharger()}
      />
      <Filtres options={statutsLogement} valeur={statut} onChange={setStatut} />
      <Message texte={erreur} erreur />
      <Carte className="p-2">
        <CarteLogements
          logements={donnees}
          onOuvrir={(id) => router.push(`/annonces?logement=${id}`)}
        />
      </Carte>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
        {legende.map(([couleur, libelle]) => (
          <span key={libelle} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ background: couleur }} />
            {libelle}
          </span>
        ))}
      </div>
    </section>
  );
}
