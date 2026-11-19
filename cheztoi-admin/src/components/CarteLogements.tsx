"use client";

import { useEffect, useRef } from "react";
import type { Map as CarteLeaflet } from "leaflet";
import "leaflet/dist/leaflet.css";
import { formaterPrix, statutsLogement, type Logement } from "@/lib/admin";

const couleurs: Record<string, string> = {
  publiee: "#0f766e",
  en_attente: "#d97706",
  suspendue: "#dc2626",
  refusee: "#dc2626",
  louee: "#2563eb",
};

function echapper(texte: string): string {
  return texte.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/// Carte Leaflet (tuiles OpenStreetMap) : un marqueur coloré par statut.
export default function CarteLogements({
  logements,
  onOuvrir,
}: {
  logements: Logement[];
  onOuvrir: (id: number) => void;
}) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<CarteLeaflet | null>(null);
  const ouvrir = useRef(onOuvrir);

  useEffect(() => {
    ouvrir.current = onOuvrir;
  }, [onOuvrir]);

  useEffect(() => {
    let annule = false;
    void import("leaflet").then((L) => {
      if (annule || !conteneur.current) return;
      if (!carte.current) {
        carte.current = L.map(conteneur.current).setView([6.1375, 1.2123], 12);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "© contributeurs OpenStreetMap",
        }).addTo(carte.current);
      }
      const instance = carte.current;
      instance.eachLayer((couche) => {
        if (couche instanceof L.Marker) couche.remove();
      });

      const points: [number, number][] = [];
      for (const l of logements) {
        if (l.latitude == null || l.longitude == null) continue;
        points.push([l.latitude, l.longitude]);
        const couleur = couleurs[l.statut] ?? "#6b7280";
        const icone = L.divIcon({
          className: "",
          html: `<span style="display:inline-block;white-space:nowrap;padding:3px 8px;border-radius:9999px;background:${couleur};color:#fff;font:600 11px sans-serif;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)">${echapper(
            formaterPrix(l.prix, l.devise),
          )}</span>`,
          iconAnchor: [30, 12],
        });
        L.marker([l.latitude, l.longitude], { icon: icone })
          .addTo(instance)
          .bindPopup(
            `<strong>${echapper(l.titre)}</strong><br>${echapper(
              [l.quartier, l.ville].filter(Boolean).join(", "),
            )}<br>${echapper(statutsLogement[l.statut] ?? l.statut)}<br>` +
              `<a href="#" data-logement="${l.id}">Ouvrir la fiche</a>`,
          )
          .on("popupopen", (e) => {
            const lien = e.popup.getElement()?.querySelector("[data-logement]");
            lien?.addEventListener("click", (ev) => {
              ev.preventDefault();
              ouvrir.current(l.id);
            });
          });
      }
      if (points.length > 0) instance.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
    });
    return () => {
      annule = true;
    };
  }, [logements]);

  useEffect(
    () => () => {
      carte.current?.remove();
      carte.current = null;
    },
    [],
  );

  return <div ref={conteneur} className="h-[70vh] min-h-96 w-full rounded-2xl" />;
}
