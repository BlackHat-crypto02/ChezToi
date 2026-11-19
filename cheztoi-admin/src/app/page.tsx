"use client";

import Link from "next/link";
import {
  RiAdvertisementLine,
  RiBuilding3Line,
  RiCalendarCheckLine,
  RiFlagLine,
  RiMoneyDollarCircleLine,
  RiTeamLine,
  RiTimeLine,
} from "@remixicon/react";
import { Carte, Message, useDonnees } from "@/components/ui";
import {
  formaterPrix,
  lireStatistiques,
  statutsLogement,
  statutsReservation,
  type Statistiques,
} from "@/lib/admin";

/// Histogramme simple des 30 derniers jours (une barre par jour).
function Histogramme({
  titre,
  points,
}: {
  titre: string;
  points: { jour: string; total: number }[];
}) {
  const jours: { jour: string; total: number }[] = [];
  const parJour = new Map(points.map((p) => [p.jour, p.total]));
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const cle = d.toISOString().slice(0, 10);
    jours.push({ jour: cle, total: parJour.get(cle) ?? 0 });
  }
  const max = Math.max(1, ...jours.map((j) => j.total));
  const total = jours.reduce((s, j) => s + j.total, 0);

  return (
    <Carte className="p-6">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-gray-700">{titre}</p>
        <p className="text-sm text-gray-500">{total} sur 30 jours</p>
      </div>
      <div className="mt-5 flex h-32 items-end gap-1" role="img" aria-label={titre}>
        {jours.map((j) => (
          <div
            key={j.jour}
            title={`${new Date(j.jour).toLocaleDateString("fr-FR")} : ${j.total}`}
            className="flex-1 rounded-t bg-pri/80 transition-colors hover:bg-pri-d"
            style={{ height: `${Math.max(4, (j.total / max) * 100)}%`, opacity: j.total ? 1 : 0.2 }}
          />
        ))}
      </div>
    </Carte>
  );
}

function Repartition({
  titre,
  valeurs,
  libelles,
}: {
  titre: string;
  valeurs: Record<string, number>;
  libelles: Record<string, string>;
}) {
  const total = Object.values(valeurs).reduce((s, v) => s + v, 0) || 1;
  const lignes = Object.entries(valeurs).sort((a, b) => b[1] - a[1]);
  return (
    <Carte className="p-6">
      <p className="text-sm font-semibold text-gray-700">{titre}</p>
      <div className="mt-4 space-y-3">
        {lignes.length === 0 && <p className="text-sm text-gray-400">Aucune donnée.</p>}
        {lignes.map(([cle, valeur]) => (
          <div key={cle}>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{libelles[cle] ?? cle}</span>
              <span className="font-semibold text-pri-d">{valeur}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-pri"
                style={{ width: `${(valeur / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Carte>
  );
}

export default function Home() {
  const { donnees: s, chargement, erreur } = useDonnees<Statistiques | null>(
    lireStatistiques,
    null,
  );

  const tuiles = s
    ? [
        {
          label: "Utilisateurs",
          value: s.utilisateurs_total,
          detail: `${s.locataires} locataires · ${s.proprietaires} propriétaires`,
          icone: RiTeamLine,
          lien: "/utilisateurs",
        },
        {
          label: "Logements",
          value: s.logements_total,
          detail: `${s.annonces_publiees} annonces publiées`,
          icone: RiBuilding3Line,
          lien: "/annonces",
        },
        {
          label: "Annonces à valider",
          value: s.annonces_en_attente,
          detail: "En attente de modération",
          icone: RiTimeLine,
          lien: "/annonces?statut=en_attente",
        },
        {
          label: "Réservations",
          value: s.reservations_total,
          detail: `${s.litiges} en litige`,
          icone: RiCalendarCheckLine,
          lien: "/reservations",
        },
        {
          label: "Signalements ouverts",
          value: s.signalements_ouverts,
          detail: "À traiter",
          icone: RiFlagLine,
          lien: "/signalements",
        },
        {
          label: "Volume confirmé",
          value: formaterPrix(s.volume_reservations),
          detail: "Loyers des réservations confirmées",
          icone: RiMoneyDollarCircleLine,
          lien: "/reservations",
        },
      ]
    : [];

  return (
    <section className="page-entree">
      <Message texte={erreur} erreur />
      <div className="mt-2 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {chargement && !s
          ? [0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100" />
            ))
          : tuiles.map((tuile) => {
              const Icone = tuile.icone;
              return (
                <Link
                  key={tuile.label}
                  href={tuile.lien}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:border-pri"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-pri">
                    <Icone size={22} />
                  </div>
                  <p className="mt-5 text-sm text-gray-500">{tuile.label}</p>
                  <p className="mt-1 text-3xl font-extrabold text-pri">{tuile.value}</p>
                  <p className="mt-1 text-xs text-gray-400">{tuile.detail}</p>
                </Link>
              );
            })}
      </div>

      {s && (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Histogramme titre="Inscriptions" points={s.inscriptions_30j} />
            <Histogramme titre="Demandes de réservation" points={s.reservations_30j} />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Repartition
              titre="Annonces par statut"
              valeurs={s.logements_par_statut}
              libelles={statutsLogement}
            />
            <Repartition
              titre="Réservations par statut"
              valeurs={s.reservations_par_statut}
              libelles={statutsReservation}
            />
            <Repartition
              titre="Annonces publiées par ville"
              valeurs={Object.fromEntries(s.villes.map((v) => [v.ville, v.total]))}
              libelles={{}}
            />
          </div>
          {s.annonces_en_attente > 0 && (
            <Link
              href="/annonces?statut=en_attente"
              className="mt-6 flex items-center gap-3 rounded-2xl bg-pri px-6 py-4 text-white hover:bg-pri-d"
            >
              <RiAdvertisementLine size={22} />
              <span className="font-semibold">
                {s.annonces_en_attente} annonce(s) attendent votre validation
              </span>
            </Link>
          )}
        </>
      )}
    </section>
  );
}
