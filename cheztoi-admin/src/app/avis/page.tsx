"use client";

import { useState } from "react";
import { RiEyeLine, RiEyeOffLine, RiStarFill } from "@remixicon/react";
import { Badge, Carte, EnTete, Message, Squelette, Vide, messageDe, useDonnees } from "@/components/ui";
import { formaterDate, listerAvis, masquerAvis, type Avis } from "@/lib/admin";

const criteres: [keyof Avis, string][] = [
  ["note_etat", "État"],
  ["note_conformite", "Conformité"],
  ["note_proprete", "Propreté"],
  ["note_communication", "Communication"],
  ["note_qualite_prix", "Qualité-prix"],
];

export default function AvisPage() {
  const { donnees, setDonnees, chargement, erreur, recharger } = useDonnees(listerAvis, [] as Avis[]);
  const [message, setMessage] = useState("");
  const [erreurAction, setErreurAction] = useState("");

  async function basculer(a: Avis) {
    setErreurAction("");
    try {
      const modifie = await masquerAvis(a.id, !a.masque);
      setDonnees((liste) => liste.map((x) => (x.id === a.id ? modifie : x)));
      setMessage(modifie.masque ? "Avis masqué au public." : "Avis de nouveau visible.");
    } catch (e) {
      setErreurAction(messageDe(e));
    }
  }

  return (
    <section className="page-entree">
      <EnTete
        titre="Modération des avis"
        sousTitre={chargement ? "Chargement en cours..." : `${donnees.length} avis`}
        chargement={chargement}
        onActualiser={() => void recharger()}
      />
      <Message texte={message} />
      <Message texte={erreur || erreurAction} erreur />
      {chargement && donnees.length === 0 ? (
        <Carte>
          <Squelette />
        </Carte>
      ) : donnees.length === 0 ? (
        <Carte>
          <Vide texte="Aucun avis publié pour le moment." />
        </Carte>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {donnees.map((a) => (
            <Carte key={a.id} className={`p-5 ${a.masque ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-800">{a.auteur.nom_complet}</p>
                  <p className="text-xs text-gray-400">
                    Logement #{a.logement} · réservation #{a.reservation} · {formaterDate(a.cree_le)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-lg font-extrabold text-pri">
                  <RiStarFill size={18} className="text-amber-500" /> {a.note_globale}
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-700">{a.commentaire || "Sans commentaire."}</p>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                {criteres.map(([cle, libelle]) => (
                  <span key={cle}>
                    {libelle} {String(a[cle])}/5
                  </span>
                ))}
              </div>
              {a.reponse_proprietaire && (
                <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                  Réponse du propriétaire : {a.reponse_proprietaire}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between">
                {a.masque ? <Badge texte="Masqué" couleur="rouge" /> : <Badge texte="Visible" couleur="vert" />}
                <button
                  type="button"
                  onClick={() => void basculer(a)}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-pri hover:bg-pri/10"
                >
                  {a.masque ? <RiEyeLine size={16} /> : <RiEyeOffLine size={16} />}
                  {a.masque ? "Rendre visible" : "Masquer"}
                </button>
              </div>
            </Carte>
          ))}
        </div>
      )}
    </section>
  );
}
