"use client";

import { useCallback, useState } from "react";
import { RiEyeLine, RiSearchLine } from "@remixicon/react";
import {
  Badge,
  Bouton,
  Carte,
  EnTete,
  Filtres,
  ImageDistante,
  Message,
  Modale,
  Squelette,
  Vide,
  messageDe,
  useDonnees,
} from "@/components/ui";
import {
  changerStatutReservation,
  formaterDate,
  formaterPrix,
  listerReservations,
  statutsReservation,
  type Reservation,
} from "@/lib/admin";

const actions: { statut: string; libelle: string; variante: "principal" | "secondaire" | "danger" }[] = [
  { statut: "confirmee", libelle: "Confirmer", variante: "principal" },
  { statut: "terminee", libelle: "Clôturer (terminée)", variante: "secondaire" },
  { statut: "en_litige", libelle: "Ouvrir un litige", variante: "secondaire" },
  { statut: "annulee", libelle: "Annuler", variante: "danger" },
];

function Detail({
  reservation: r,
  onFermer,
  onModifie,
}: {
  reservation: Reservation;
  onFermer: () => void;
  onModifie: (r: Reservation) => void;
}) {
  const [motif, setMotif] = useState(r.motif);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const devise = r.logement.devise;

  async function changer(statut: string) {
    setEnvoi(true);
    setErreur("");
    try {
      onModifie(await changerStatutReservation(r.id, statut, motif));
    } catch (e) {
      setErreur(messageDe(e));
    } finally {
      setEnvoi(false);
    }
  }

  const lignes: [string, string][] = [
    ["Logement", `${r.logement.titre} (${r.logement.ville})`],
    ["Locataire", r.locataire.nom_complet],
    ["Propriétaire", r.proprietaire.nom_complet],
    ["Période", `${formaterDate(r.date_debut)} → ${formaterDate(r.date_fin)}`],
    ["Personnes", String(r.nombre_personnes)],
    ["Location", formaterPrix(r.montant_location, devise)],
    ["Caution", formaterPrix(r.caution, devise)],
    ["Avance", formaterPrix(r.avance, devise)],
    ["Frais", formaterPrix(r.frais, devise)],
    ["Total", formaterPrix(r.montant_total, devise)],
    ["Demandée le", formaterDate(r.cree_le)],
  ];

  return (
    <Modale titre={`Réservation #${r.id}`} onFermer={onFermer}>
      <Badge texte={statutsReservation[r.statut] ?? r.statut} statut={r.statut} />
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {lignes.map(([cle, valeur]) => (
          <div key={cle} className="contents">
            <dt className="text-gray-500">{cle}</dt>
            <dd className="font-medium text-gray-800">{valeur}</dd>
          </div>
        ))}
      </dl>
      {r.message && (
        <p className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">« {r.message} »</p>
      )}
      <div className="mt-5 border-t border-gray-100 pt-4">
        <Message texte={erreur} erreur />
        <label htmlFor="motif-resa" className="text-sm font-semibold text-gray-700">
          Note / motif (visible des deux parties)
        </label>
        <textarea
          id="motif-resa"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-pri focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {actions
            .filter((a) => a.statut !== r.statut)
            .map((a) => (
              <Bouton
                key={a.statut}
                variante={a.variante}
                disabled={envoi}
                onClick={() => void changer(a.statut)}
              >
                {a.libelle}
              </Bouton>
            ))}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Le locataire et le propriétaire sont notifiés de chaque changement.
        </p>
      </div>
    </Modale>
  );
}

export default function ReservationsPage() {
  const [statut, setStatut] = useState("");
  const [recherche, setRecherche] = useState("");
  const [q, setQ] = useState("");
  const [selection, setSelection] = useState<Reservation | null>(null);
  const [message, setMessage] = useState("");

  const charger = useCallback(() => listerReservations({ statut, q }), [statut, q]);
  const { donnees, setDonnees, chargement, erreur, recharger } = useDonnees(
    charger,
    [] as Reservation[],
  );

  return (
    <section className="page-entree">
      <EnTete
        titre="Réservations"
        sousTitre={chargement ? "Chargement en cours..." : `${donnees.length} réservation(s)`}
        chargement={chargement}
        onActualiser={() => void recharger()}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQ(recherche.trim());
          }}
          className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3"
        >
          <RiSearchLine size={17} className="text-gray-400" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Logement, locataire, ville…"
            className="w-56 text-sm outline-none"
          />
        </form>
      </EnTete>
      <Filtres options={statutsReservation} valeur={statut} onChange={setStatut} />
      <Message texte={message} />
      <Message texte={erreur} erreur />

      <Carte>
        {chargement && donnees.length === 0 ? (
          <Squelette />
        ) : donnees.length === 0 ? (
          <Vide texte="Aucune réservation pour ces critères." />
        ) : (
          <div className="sans-barre overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-4">Logement</th>
                  <th className="px-5 py-4">Locataire</th>
                  <th className="px-5 py-4">Période</th>
                  <th className="px-5 py-4">Montant</th>
                  <th className="px-5 py-4">Statut</th>
                  <th className="px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {donnees.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <ImageDistante src={r.logement.photo} alt={r.logement.titre} className="h-10 w-14 shrink-0 rounded-lg" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-800">{r.logement.titre}</p>
                          <p className="text-xs text-gray-500">#{r.id} · {r.logement.ville}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{r.locataire.nom_complet}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {formaterDate(r.date_debut)} → {formaterDate(r.date_fin)}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {formaterPrix(r.montant_total, r.logement.devise)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge texte={statutsReservation[r.statut] ?? r.statut} statut={r.statut} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelection(r)}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-pri hover:bg-pri/10"
                      >
                        <RiEyeLine size={16} /> Gérer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Carte>

      {selection && (
        <Detail
          reservation={selection}
          onFermer={() => setSelection(null)}
          onModifie={(r) => {
            setSelection(null);
            setMessage(`Réservation #${r.id} : ${statutsReservation[r.statut]}.`);
            setDonnees((liste) => liste.map((x) => (x.id === r.id ? r : x)));
          }}
        />
      )}
    </section>
  );
}
