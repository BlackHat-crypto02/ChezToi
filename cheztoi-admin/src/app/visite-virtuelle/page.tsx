"use client";

import { useCallback, useState } from "react";
import { RiBox3Line, RiDragMove2Line } from "@remixicon/react";
import { Badge, Carte, EnTete, ImageDistante, Message, Squelette, Vide, useDonnees } from "@/components/ui";
import VisionneusePanorama from "@/components/VisionneusePanorama";
import { listerLogements, statutsLogement, type Logement } from "@/lib/admin";

export default function VisiteVirtuellePage() {
  const charger = useCallback(async () => {
    const logements = await listerLogements();
    return logements.filter((l) => l.panoramas.length > 0);
  }, []);
  const { donnees, chargement, erreur, recharger } = useDonnees(charger, [] as Logement[]);
  const [choisi, setChoisi] = useState<number | null>(null);
  const [piece, setPiece] = useState(0);

  const logement = donnees.find((l) => l.id === choisi) ?? donnees[0];
  const panorama = logement?.panoramas[Math.min(piece, logement.panoramas.length - 1)];

  return (
    <section className="page-entree">
      <EnTete
        titre="Visites virtuelles 360°"
        sousTitre={
          chargement ? "Chargement en cours..." : `${donnees.length} logement(s) avec une visite`
        }
        chargement={chargement}
        onActualiser={() => void recharger()}
      />
      <Message texte={erreur} erreur />
      {chargement && donnees.length === 0 ? (
        <Carte>
          <Squelette />
        </Carte>
      ) : donnees.length === 0 || !logement || !panorama ? (
        <Carte>
          <Vide texte="Aucun propriétaire n’a encore ajouté de vue 360°." />
        </Carte>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <Carte>
            <ul className="sans-barre max-h-[70vh] divide-y divide-gray-100 overflow-y-auto">
              {donnees.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setChoisi(l.id);
                      setPiece(0);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 ${
                      l.id === logement.id ? "bg-pri/5" : ""
                    }`}
                  >
                    <ImageDistante src={l.photo} alt={l.titre} className="h-10 w-14 shrink-0 rounded-lg" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-gray-800">{l.titre}</span>
                      <span className="block text-xs text-gray-500">
                        {l.panoramas.length} pièce(s) · {statutsLogement[l.statut]}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Carte>
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <RiBox3Line size={18} className="text-pri" />
              <span className="font-semibold text-gray-800">{logement.titre}</span>
              <Badge texte={statutsLogement[logement.statut] ?? logement.statut} statut={logement.statut} />
            </div>
            <VisionneusePanorama key={panorama.id} src={panorama.image} titre={panorama.piece} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {logement.panoramas.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPiece(i)}
                  className={`h-9 rounded-full px-4 text-sm font-semibold ${
                    p.id === panorama.id
                      ? "bg-pri text-white"
                      : "border border-gray-200 bg-white text-gray-600 hover:border-pri"
                  }`}
                >
                  {p.piece}
                </button>
              ))}
              <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                <RiDragMove2Line size={14} /> Glissez pour tourner, molette pour zoomer
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
