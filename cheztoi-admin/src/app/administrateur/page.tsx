"use client";

import { useCallback, useState } from "react";
import { RiMailSendLine, RiShieldUserLine, RiUserAddLine } from "@remixicon/react";
import FormulaireAdministrateur from "@/components/FormulaireAdministrateur";
import { Badge, Bouton, Carte, EnTete, Message, Squelette, Vide, messageDe, useDonnees } from "@/components/ui";
import { formaterDate } from "@/lib/admin";
import { listerUtilisateurs, renvoyerInvitation, type Utilisateur } from "@/lib/utilisateurs";

export default function AdministrateurPage() {
  const charger = useCallback(
    async () => (await listerUtilisateurs()).filter((u) => u.role === "admin"),
    [],
  );
  const { donnees, chargement, erreur, recharger } = useDonnees(charger, [] as Utilisateur[]);
  const [formulaire, setFormulaire] = useState(false);
  const [message, setMessage] = useState("");
  const [erreurAction, setErreurAction] = useState("");

  async function renvoyer(u: Utilisateur) {
    setErreurAction("");
    try {
      setMessage((await renvoyerInvitation(u.id)).message);
    } catch (e) {
      setErreurAction(messageDe(e));
    }
  }

  return (
    <section className="page-entree">
      <EnTete
        titre="Administrateurs"
        sousTitre={chargement ? "Chargement en cours..." : `${donnees.length} administrateur(s)`}
        chargement={chargement}
        onActualiser={() => void recharger()}
      >
        <Bouton onClick={() => setFormulaire(true)}>
          <RiUserAddLine size={18} /> Inviter un administrateur
        </Bouton>
      </EnTete>
      <Message texte={message} />
      <Message texte={erreur || erreurAction} erreur />
      <Carte>
        {chargement && donnees.length === 0 ? (
          <Squelette />
        ) : donnees.length === 0 ? (
          <Vide texte="Aucun administrateur." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {donnees.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pri/10 text-pri">
                  <RiShieldUserLine size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-gray-800">{u.nom_complet}</span>
                  <span className="block text-xs text-gray-500">
                    {u.email} · depuis le {formaterDate(u.date_joined)}
                  </span>
                </span>
                {u.invitation_en_attente ? (
                  <>
                    <Badge texte="Invitation en attente" couleur="orange" />
                    <button
                      type="button"
                      onClick={() => void renvoyer(u)}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-pri hover:text-pri-d"
                    >
                      <RiMailSendLine size={15} /> Renvoyer
                    </button>
                  </>
                ) : (
                  <Badge texte={u.is_active ? "Actif" : "Inactif"} couleur={u.is_active ? "vert" : "gris"} />
                )}
              </li>
            ))}
          </ul>
        )}
      </Carte>
      {formulaire && (
        <FormulaireAdministrateur
          onFermer={() => setFormulaire(false)}
          onCree={(texte) => {
            setFormulaire(false);
            setMessage(texte);
            void recharger();
          }}
        />
      )}
    </section>
  );
}
