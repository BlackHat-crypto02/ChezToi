"use client";

import { useState, type FormEvent } from "react";
import { RiAddLine, RiDeleteBinLine } from "@remixicon/react";
import { Bouton, Carte, EnTete, Message, Squelette, Vide, messageDe, useDonnees } from "@/components/ui";
import {
  creerEquipement,
  listerEquipements,
  modifierEquipement,
  supprimerEquipement,
  type Equipement,
} from "@/lib/admin";

export default function EquipementsPage() {
  const { donnees, setDonnees, chargement, erreur, recharger } = useDonnees(
    listerEquipements,
    [] as Equipement[],
  );
  const [nom, setNom] = useState("");
  const [message, setMessage] = useState("");
  const [erreurAction, setErreurAction] = useState("");

  async function ajouter(e: FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    setErreurAction("");
    try {
      const equipement = await creerEquipement(nom.trim());
      setDonnees((liste) => [...liste, equipement].sort((a, b) => a.nom.localeCompare(b.nom)));
      setNom("");
      setMessage(`« ${equipement.nom} » ajouté : les propriétaires peuvent le sélectionner.`);
    } catch (err) {
      setErreurAction(messageDe(err));
    }
  }

  async function basculer(eq: Equipement) {
    setErreurAction("");
    try {
      const modifie = await modifierEquipement(eq.id, { actif: !eq.actif });
      setDonnees((liste) => liste.map((x) => (x.id === eq.id ? modifie : x)));
    } catch (err) {
      setErreurAction(messageDe(err));
    }
  }

  async function supprimer(eq: Equipement) {
    if (!window.confirm(`Supprimer « ${eq.nom} » ? Il sera retiré de toutes les annonces.`)) return;
    setErreurAction("");
    try {
      await supprimerEquipement(eq.id);
      setDonnees((liste) => liste.filter((x) => x.id !== eq.id));
    } catch (err) {
      setErreurAction(messageDe(err));
    }
  }

  return (
    <section className="page-entree">
      <EnTete
        titre="Équipements"
        sousTitre="Liste proposée aux propriétaires dans le formulaire de publication."
        chargement={chargement}
        onActualiser={() => void recharger()}
      />
      <Message texte={message} />
      <Message texte={erreur || erreurAction} erreur />
      <form onSubmit={(e) => void ajouter(e)} className="mb-4 flex flex-wrap gap-3">
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Nouvel équipement (ex. : Climatisation)"
          className="h-10 min-w-64 flex-1 rounded-xl border border-gray-200 px-3 text-sm focus:border-pri focus:outline-none"
        />
        <Bouton type="submit">
          <RiAddLine size={18} /> Ajouter
        </Bouton>
      </form>
      <Carte>
        {chargement && donnees.length === 0 ? (
          <Squelette />
        ) : donnees.length === 0 ? (
          <Vide texte="Aucun équipement. Ajoutez-en un ci-dessus." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {donnees.map((eq) => (
              <li key={eq.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className={`font-medium ${eq.actif ? "text-gray-800" : "text-gray-400 line-through"}`}>
                  {eq.nom}
                </span>
                <span className="flex items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={eq.actif}
                      onChange={() => void basculer(eq)}
                      className="h-4 w-4 accent-pri"
                    />
                    Proposé
                  </label>
                  <button
                    type="button"
                    onClick={() => void supprimer(eq)}
                    aria-label={`Supprimer ${eq.nom}`}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <RiDeleteBinLine size={17} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Carte>
    </section>
  );
}
