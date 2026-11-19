"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { RiFlagLine } from "@remixicon/react";
import {
  Badge,
  Bouton,
  Carte,
  EnTete,
  Filtres,
  Message,
  Modale,
  Squelette,
  Vide,
  messageDe,
  useDonnees,
} from "@/components/ui";
import {
  formaterDate,
  listerSignalements,
  statutsSignalement,
  traiterSignalement,
  type Signalement,
} from "@/lib/admin";

function Traitement({
  signalement: s,
  onFermer,
  onTraite,
}: {
  signalement: Signalement;
  onFermer: () => void;
  onTraite: (s: Signalement) => void;
}) {
  const [decision, setDecision] = useState(s.decision);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  async function enregistrer(statut: string) {
    setEnvoi(true);
    setErreur("");
    try {
      onTraite(await traiterSignalement(s.id, statut, decision.trim()));
    } catch (e) {
      setErreur(messageDe(e));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modale titre={`Signalement #${s.id} — ${s.motif_libelle}`} onFermer={onFermer}>
      <div className="flex flex-wrap gap-2">
        <Badge texte={s.statut_libelle} statut={s.statut} />
        <Badge texte={s.resume_cible} couleur="bleu" />
      </div>
      <p className="mt-4 text-sm text-gray-500">
        Émis par <span className="font-semibold text-gray-800">{s.auteur.nom_complet}</span> le{" "}
        {formaterDate(s.cree_le)}
      </p>
      <p className="mt-3 whitespace-pre-line rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
        {s.description || "Aucune description."}
      </p>
      {s.piece_jointe && (
        <a href={s.piece_jointe} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-pri">
          Voir la pièce jointe
        </a>
      )}
      {s.logement && (
        <p className="mt-3 text-sm">
          <Link href={`/annonces?logement=${s.logement}`} className="font-semibold text-pri hover:underline">
            Examiner l’annonce concernée
          </Link>{" "}
          <span className="text-gray-400">(suspendez-la depuis la page Annonces si nécessaire)</span>
        </p>
      )}
      {s.reservation && (
        <p className="mt-3 text-sm text-gray-600">
          Litige sur la réservation #{s.reservation} : gérez son statut depuis la page Réservations.
        </p>
      )}
      <div className="mt-5 border-t border-gray-100 pt-4">
        <Message texte={erreur} erreur />
        <label htmlFor="decision" className="text-sm font-semibold text-gray-700">
          Décision (envoyée à l’auteur du signalement)
        </label>
        <textarea
          id="decision"
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-pri focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {s.statut === "ouvert" && (
            <Bouton variante="secondaire" disabled={envoi} onClick={() => void enregistrer("en_cours")}>
              Prendre en charge
            </Bouton>
          )}
          <Bouton disabled={envoi} onClick={() => void enregistrer("resolu")}>
            Marquer résolu
          </Bouton>
          <Bouton variante="danger" disabled={envoi} onClick={() => void enregistrer("rejete")}>
            Rejeter
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

export default function SignalementsPage() {
  const [statut, setStatut] = useState("ouvert");
  const [selection, setSelection] = useState<Signalement | null>(null);
  const [message, setMessage] = useState("");
  const charger = useCallback(() => listerSignalements(statut), [statut]);
  const { donnees, setDonnees, chargement, erreur, recharger } = useDonnees(
    charger,
    [] as Signalement[],
  );

  return (
    <section className="page-entree">
      <EnTete
        titre="Signalements et litiges"
        sousTitre={chargement ? "Chargement en cours..." : `${donnees.length} dossier(s)`}
        chargement={chargement}
        onActualiser={() => void recharger()}
      />
      <Filtres options={statutsSignalement} valeur={statut} onChange={setStatut} />
      <Message texte={message} />
      <Message texte={erreur} erreur />
      <Carte>
        {chargement && donnees.length === 0 ? (
          <Squelette />
        ) : donnees.length === 0 ? (
          <Vide texte="Aucun signalement dans cette catégorie." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {donnees.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSelection(s)}
                  className="flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-gray-50/70"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <RiFlagLine size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-800">{s.motif_libelle}</span>
                      <Badge texte={s.statut_libelle} statut={s.statut} />
                    </span>
                    <span className="mt-0.5 block text-sm text-gray-600">{s.resume_cible}</span>
                    <span className="mt-0.5 block truncate text-xs text-gray-400">
                      {s.auteur.nom_complet} · {formaterDate(s.cree_le)} · {s.description}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Carte>
      {selection && (
        <Traitement
          signalement={selection}
          onFermer={() => setSelection(null)}
          onTraite={(s) => {
            setSelection(null);
            setMessage(`Signalement #${s.id} : ${s.statut_libelle}.`);
            setDonnees((liste) =>
              statut && s.statut !== statut
                ? liste.filter((x) => x.id !== s.id)
                : liste.map((x) => (x.id === s.id ? s : x)),
            );
          }}
        />
      )}
    </section>
  );
}
