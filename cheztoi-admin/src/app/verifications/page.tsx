"use client";

import { useCallback, useState } from "react";
import { RiCheckLine, RiCloseLine, RiFileTextLine } from "@remixicon/react";
import {
  Badge,
  Bouton,
  Carte,
  EnTete,
  Filtres,
  Message,
  Squelette,
  Vide,
  messageDe,
  useDonnees,
} from "@/components/ui";
import {
  formaterDate,
  listerJustificatifs,
  ouvrirJustificatif,
  statutsJustificatif,
  traiterJustificatif,
  type Justificatif,
} from "@/lib/admin";

const couleurStatut = { en_attente: "orange", accepte: "vert", refuse: "rouge" } as const;

export default function VerificationsPage() {
  const [statut, setStatut] = useState("en_attente");
  const [message, setMessage] = useState("");
  const [erreurAction, setErreurAction] = useState("");
  const [enCours, setEnCours] = useState<number | null>(null);
  const charger = useCallback(() => listerJustificatifs(statut), [statut]);
  const { donnees, setDonnees, chargement, erreur, recharger } = useDonnees(
    charger,
    [] as Justificatif[],
  );

  async function traiter(j: Justificatif, decision: "accepte" | "refuse") {
    let motif = "";
    if (decision === "refuse") {
      motif = window.prompt("Motif du refus (envoyé au propriétaire) :")?.trim() ?? "";
      if (!motif) return;
    }
    setEnCours(j.id);
    setErreurAction("");
    try {
      const modifie = await traiterJustificatif(j.id, decision, motif);
      setDonnees((liste) =>
        statut && modifie.statut !== statut
          ? liste.filter((x) => x.id !== j.id)
          : liste.map((x) => (x.id === j.id ? modifie : x)),
      );
      setMessage(
        decision === "accepte"
          ? `${j.utilisateur.nom_complet} est maintenant vérifié.`
          : "Document refusé, le propriétaire est prévenu.",
      );
    } catch (e) {
      setErreurAction(messageDe(e));
    } finally {
      setEnCours(null);
    }
  }

  async function voir(j: Justificatif) {
    setErreurAction("");
    try {
      await ouvrirJustificatif(j.id);
    } catch (e) {
      setErreurAction(messageDe(e, "Impossible d’ouvrir le document."));
    }
  }

  return (
    <section className="page-entree">
      <EnTete
        titre="Vérification des comptes"
        sousTitre={chargement ? "Chargement en cours..." : `${donnees.length} document(s)`}
        chargement={chargement}
        onActualiser={() => void recharger()}
      />
      <Filtres options={statutsJustificatif} valeur={statut} onChange={setStatut} />
      <Message texte={message} />
      <Message texte={erreur || erreurAction} erreur />
      <Carte>
        {chargement && donnees.length === 0 ? (
          <Squelette />
        ) : donnees.length === 0 ? (
          <Vide texte="Aucun document dans cette catégorie." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {donnees.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pri/10 text-pri">
                  <RiFileTextLine size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-800">{j.utilisateur.nom_complet}</span>
                    {j.utilisateur.verified && <Badge texte="Compte vérifié" couleur="vert" />}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {j.type_libelle} · {j.utilisateur.email} · envoyé le {formaterDate(j.cree_le)}
                  </span>
                  {j.motif && <span className="block text-xs text-red-700">Refus : {j.motif}</span>}
                </span>
                <Badge
                  texte={j.statut_libelle}
                  couleur={couleurStatut[j.statut as keyof typeof couleurStatut] ?? "gris"}
                />
                <Bouton variante="secondaire" onClick={() => void voir(j)}>
                  Voir le document
                </Bouton>
                {j.statut === "en_attente" && (
                  <>
                    <Bouton disabled={enCours === j.id} onClick={() => void traiter(j, "accepte")}>
                      <RiCheckLine size={17} /> Accepter
                    </Bouton>
                    <Bouton
                      variante="danger"
                      disabled={enCours === j.id}
                      onClick={() => void traiter(j, "refuse")}
                    >
                      <RiCloseLine size={17} /> Refuser
                    </Bouton>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Carte>
    </section>
  );
}
