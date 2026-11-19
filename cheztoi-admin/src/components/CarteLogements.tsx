"use client";

import { useEffect, useRef } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { formaterPrix, statutsLogement, typesLogement, type Logement } from "@/lib/admin";

const couleurs: Record<string, string> = {
  publiee: "#0f766e",
  en_attente: "#d97706",
  suspendue: "#dc2626",
  refusee: "#dc2626",
  louee: "#2563eb",
};

/// Distance (en pixels écran) en dessous de laquelle les marqueurs sont regroupés.
const RAYON_GROUPE = 56;

function echapper(texte: string): string {
  return texte.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function prixCourt(prix: number): string {
  if (prix >= 1_000_000) return `${(prix / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  if (prix >= 1000) return `${Math.round(prix / 1000)} k`;
  return String(prix);
}

type Point = { logement: Logement; lat: number; lng: number };

/// Regroupe les logements trop proches à l'écran pour le niveau de zoom courant.
function regrouper(carte: Leaflet.Map, points: Point[]): Point[][] {
  const zoom = carte.getZoom();
  const groupes: { x: number; y: number; membres: Point[] }[] = [];
  for (const point of points) {
    const pixel = carte.project([point.lat, point.lng], zoom);
    const proche = groupes.find(
      (g) => Math.hypot(g.x - pixel.x, g.y - pixel.y) < RAYON_GROUPE,
    );
    if (proche) proche.membres.push(point);
    else groupes.push({ x: pixel.x, y: pixel.y, membres: [point] });
  }
  return groupes.map((g) => g.membres);
}

function contenuPopup(l: Logement): string {
  const photo = l.photo
    ? `<img src="${echapper(l.photo)}" alt="" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px">`
    : "";
  const couleur = couleurs[l.statut] ?? "#6b7280";
  return `<div style="width:220px;font-family:inherit">
    ${photo}
    <div style="font-weight:700;color:#1f2937;margin-bottom:2px">${echapper(l.titre)}</div>
    <div style="color:#6b7280;font-size:12px">${echapper(
      [typesLogement[l.type_logement], [l.quartier, l.ville].filter(Boolean).join(", ")]
        .filter(Boolean)
        .join(" · "),
    )}</div>
    <div style="margin:6px 0;font-weight:600;color:#0b5f58">${echapper(formaterPrix(l.prix, l.devise))}</div>
    <span style="display:inline-block;padding:2px 8px;border-radius:9999px;background:${couleur}1a;color:${couleur};font-size:11px;font-weight:600">${echapper(
      statutsLogement[l.statut] ?? l.statut,
    )}</span>
    <button type="button" data-ouvrir-logement="${l.id}" style="display:block;width:100%;margin-top:10px;padding:7px 0;border-radius:8px;background:#0f766e;color:#fff;font-weight:600;font-size:12px;border:0;cursor:pointer">Ouvrir la fiche</button>
  </div>`;
}

/// Carte Leaflet (tuiles OpenStreetMap) : prix par logement, couleur par statut,
/// regroupement des marqueurs proches, aperçu au clic.
export default function CarteLogements({
  logements,
  onOuvrir,
}: {
  logements: Logement[];
  onOuvrir: (id: number) => void;
}) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<Leaflet.Map | null>(null);
  const couche = useRef<Leaflet.LayerGroup | null>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const points = useRef<Point[]>([]);
  const ouvrir = useRef(onOuvrir);

  useEffect(() => {
    ouvrir.current = onOuvrir;
  }, [onOuvrir]);

  // Création unique de la carte.
  useEffect(() => {
    let annule = false;
    let observateur: ResizeObserver | null = null;
    const element = conteneur.current;

    // Un seul écouteur pour tous les boutons « Ouvrir la fiche » des popups.
    // En phase de capture : Leaflet bloque la propagation des clics dans ses popups.
    function surClic(e: MouseEvent) {
      const bouton = (e.target as HTMLElement).closest<HTMLElement>("[data-ouvrir-logement]");
      if (bouton) ouvrir.current(Number(bouton.dataset.ouvrirLogement));
    }
    element?.addEventListener("click", surClic, true);

    void import("leaflet").then((module) => {
      if (annule || !element || carte.current) return;
      L.current = module;
      const instance = module.map(element, { zoomControl: true }).setView([6.1375, 1.2123], 12);
      module
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "© contributeurs OpenStreetMap",
        })
        .addTo(instance);
      couche.current = module.layerGroup().addTo(instance);
      carte.current = instance;
      instance.on("zoomend", () => dessiner());
      // La largeur change quand le menu de gauche s'ouvre : Leaflet doit le savoir.
      observateur = new ResizeObserver(() => instance.invalidateSize());
      observateur.observe(element);
      placer(true);
    });

    return () => {
      annule = true;
      element?.removeEventListener("click", surClic, true);
      observateur?.disconnect();
      carte.current?.remove();
      carte.current = null;
      couche.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dessiner() {
    const module = L.current;
    const instance = carte.current;
    const groupe = couche.current;
    if (!module || !instance || !groupe) return;
    groupe.clearLayers();

    for (const membres of regrouper(instance, points.current)) {
      if (membres.length === 1) {
        const { logement: l, lat, lng } = membres[0];
        const couleur = couleurs[l.statut] ?? "#6b7280";
        const texte = `${prixCourt(l.prix)} F`;
        // Taille exacte de l'étiquette : la zone cliquable de Leaflet colle au visuel,
        // et la pointe (en bas, au centre) tombe sur la position du logement.
        const largeur = Math.round(texte.length * 7.5 + 24);
        const icone = module.divIcon({
          className: "",
          iconSize: [largeur, 32],
          iconAnchor: [largeur / 2, 32],
          popupAnchor: [0, -30],
          html: `<div style="width:${largeur}px;height:32px;display:flex;flex-direction:column;align-items:center;cursor:pointer">
            <span style="box-sizing:border-box;width:100%;height:26px;display:flex;align-items:center;justify-content:center;white-space:nowrap;border-radius:9999px;background:${couleur};color:#fff;font:600 12px sans-serif;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)">${echapper(
              texte,
            )}</span>
            <span style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid ${couleur};margin-top:-1px"></span>
          </div>`,
        });
        module
          .marker([lat, lng], { icon: icone, title: l.titre, riseOnHover: true })
          .bindPopup(contenuPopup(l), { maxWidth: 240 })
          .addTo(groupe);
      } else {
        const taille = membres.length < 10 ? 38 : 46;
        const icone = module.divIcon({
          className: "",
          iconSize: [taille, taille],
          iconAnchor: [taille / 2, taille / 2],
          html: `<div style="box-sizing:border-box;width:${taille}px;height:${taille}px;border-radius:9999px;background:#0b5f58;color:#fff;display:flex;align-items:center;justify-content:center;font:700 14px sans-serif;border:3px solid #fff;box-shadow:0 0 0 4px rgba(15,118,110,.25);cursor:pointer">${membres.length}</div>`,
        });
        const limites = module.latLngBounds(membres.map((m) => [m.lat, m.lng] as [number, number]));
        module
          .marker(limites.getCenter(), {
            icon: icone,
            title: `${membres.length} logements`,
          })
          .on("click", () => {
            // Mêmes coordonnées au zoom maximal : on liste plutôt que de zoomer.
            const identiques = limites.getNorthEast().equals(limites.getSouthWest());
            if (identiques || instance.getZoom() >= instance.getMaxZoom()) {
              module
                .popup({ maxWidth: 260 })
                .setLatLng(limites.getCenter())
                .setContent(
                  `<div style="max-height:260px;overflow:auto">${membres
                    .map((m) => contenuPopup(m.logement))
                    .join('<hr style="margin:10px 0">')}</div>`,
                )
                .openOn(instance);
            } else {
              instance.fitBounds(limites, { padding: [60, 60], maxZoom: 17 });
            }
          })
          .addTo(groupe);
      }
    }
  }

  /// Met à jour les points et, si demandé, recadre la carte sur eux.
  function placer(recadrer: boolean) {
    const instance = carte.current;
    points.current = logements
      .filter((l) => l.latitude != null && l.longitude != null)
      .map((l) => ({ logement: l, lat: l.latitude!, lng: l.longitude! }));
    if (!instance) return;
    if (recadrer && points.current.length > 0) {
      instance.fitBounds(
        points.current.map((p) => [p.lat, p.lng] as [number, number]),
        { padding: [50, 50], maxZoom: 15 },
      );
    }
    dessiner();
  }

  // Nouvelles données (filtre ou actualisation) : on redessine et recadre.
  useEffect(() => {
    placer(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logements]);

  // `isolate` : les z-index internes de Leaflet (400 à 1000) restent sous le
  // menu mobile et les fenêtres de l'administration.
  return (
    <div
      ref={conteneur}
      className="isolate z-0 h-[70vh] min-h-96 w-full rounded-2xl"
      role="region"
      aria-label="Carte des logements"
    />
  );
}
