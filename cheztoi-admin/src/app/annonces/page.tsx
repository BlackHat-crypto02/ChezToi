"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  RiCheckLine,
  RiCloseLine,
  RiEyeLine,
  RiFlagLine,
  RiPauseCircleLine,
  RiPlayCircleLine,
  RiSearchLine,
  RiShieldCheckLine,
} from "@remixicon/react";
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
  formaterDate,
  formaterPrix,
  lireLogement,
  listerLogements,
  modererLogement,
  periodicites,
  statutsLogement,
  typesLogement,
  type Logement,
} from "@/lib/admin";

type Action = Parameters<typeof modererLogement>[1];

function Fiche({
  logement,
  onFermer,
  onModere,
}: {
  logement: Logement;
  onFermer: () => void;
  onModere: (l: Logement, message: string) => void;
}) {
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [image, setImage] = useState(0);
  const l = logement;
  const images = l.photos.length ? l.photos.map((p) => p.image) : l.photo ? [l.photo] : [];

  async function agir(action: Action, succes: string) {
    if ((action === "refuser" || action === "suspendre") && !motif.trim()) {
      setErreur("Indiquez un motif : il sera transmis au propriétaire.");
      return;
    }
    setEnvoi(true);
    setErreur("");
    try {
      onModere(await modererLogement(l.id, action, motif.trim()), succes);
    } catch (e) {
      setErreur(messageDe(e));
    } finally {
      setEnvoi(false);
    }
  }

  const caracteristiques: [string, string][] = [
    ["Type", typesLogement[l.type_logement] ?? l.type_logement],
    ["Prix", `${formaterPrix(l.prix, l.devise)} / ${periodicites[l.periodicite] ?? l.periodicite}`],
    ["Chambres", String(l.chambres)],
    ["Salons", String(l.salons)],
    ["Salles de bain", String(l.salles_de_bain)],
    ["Superficie", l.superficie ? `${l.superficie} m²` : "—"],
    ["Meublé", l.meuble ? "Oui" : "Non"],
    ["Caution", l.caution ? formaterPrix(l.caution, l.devise) : "—"],
    ["Avance", l.avance ? formaterPrix(l.avance, l.devise) : "—"],
    ["Réservation", l.reservation_instantanee ? "Instantanée" : "Sur validation"],
    ["Adresse", [l.adresse, l.quartier, l.commune, l.ville, l.region].filter(Boolean).join(", ")],
    [
      "Position GPS",
      l.latitude != null ? `${l.latitude.toFixed(5)}, ${l.longitude?.toFixed(5)}` : "Non renseignée",
    ],
  ];

  return (
    <Modale titre={l.titre} onFermer={onFermer} large>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <ImageDistante
            src={images[image]}
            alt={l.titre}
            className="h-64 w-full rounded-xl"
          />
          {images.length > 1 && (
            <div className="sans-barre mt-2 flex gap-2 overflow-x-auto">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setImage(i)}
                  className={`shrink-0 overflow-hidden rounded-lg border-2 ${
                    i === image ? "border-pri" : "border-transparent"
                  }`}
                >
                  <ImageDistante src={src} alt={`Photo ${i + 1}`} className="h-14 w-20" />
                </button>
              ))}
            </div>
          )}
          {images.length === 0 && (
            <p className="mt-2 text-sm text-red-700">Aucune photo : l’annonce ne peut pas être validée en l’état.</p>
          )}
          {l.panoramas.length > 0 && (
            <p className="mt-3 text-sm text-gray-600">
              {l.panoramas.length} vue(s) 360° :{" "}
              {l.panoramas.map((p) => p.piece).join(", ")} — visibles dans « Visite virtuelle ».
            </p>
          )}
          <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm">
            <p className="font-semibold text-gray-700">Propriétaire</p>
            <p className="mt-1 text-gray-800">
              {l.proprietaire.nom_complet}{" "}
              {l.proprietaire.verified && <Badge texte="Vérifié" couleur="vert" />}
            </p>
            <p className="text-gray-500">{l.proprietaire.email}</p>
            <p className="text-gray-500">{l.proprietaire.phone || "Pas de téléphone"}</p>
          </div>
        </div>
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge texte={statutsLogement[l.statut] ?? l.statut} statut={l.statut} />
            {l.verifie && <Badge texte="Annonce vérifiée" couleur="vert" />}
            {l.nombre_signalements > 0 && (
              <Badge texte={`${l.nombre_signalements} signalement(s)`} couleur="rouge" />
            )}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {caracteristiques.map(([cle, valeur]) => (
              <div key={cle} className="contents">
                <dt className="text-gray-500">{cle}</dt>
                <dd className="font-medium text-gray-800">{valeur || "—"}</dd>
              </div>
            ))}
          </dl>
          {l.equipements.length > 0 && (
            <p className="mt-4 text-sm text-gray-600">
              <span className="font-semibold text-gray-700">Équipements : </span>
              {l.equipements.map((e) => e.nom).join(", ")}
            </p>
          )}
          {l.description && (
            <p className="mt-4 whitespace-pre-line text-sm text-gray-600">{l.description}</p>
          )}
          {l.motif_refus && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">
              Dernier motif communiqué : {l.motif_refus}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-gray-100 pt-5">
        <Message texte={erreur} erreur />
        <label className="text-sm font-semibold text-gray-700" htmlFor="motif">
          Motif (obligatoire pour refuser ou suspendre)
        </label>
        <textarea
          id="motif"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-pri focus:outline-none"
          placeholder="Ex. : photos floues, adresse incomplète…"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {["en_attente", "refusee"].includes(l.statut) && (
            <Bouton disabled={envoi} onClick={() => void agir("valider", "Annonce publiée.")}>
              <RiCheckLine size={18} /> Valider et publier
            </Bouton>
          )}
          {l.statut === "en_attente" && (
            <Bouton
              variante="danger"
              disabled={envoi}
              onClick={() => void agir("refuser", "Annonce refusée, le propriétaire est prévenu.")}
            >
              <RiCloseLine size={18} /> Refuser
            </Bouton>
          )}
          {["publiee", "louee"].includes(l.statut) && (
            <Bouton
              variante="danger"
              disabled={envoi}
              onClick={() => void agir("suspendre", "Annonce suspendue.")}
            >
              <RiPauseCircleLine size={18} /> Suspendre
            </Bouton>
          )}
          {l.statut === "suspendue" && (
            <Bouton disabled={envoi} onClick={() => void agir("reactiver", "Annonce réactivée.")}>
              <RiPlayCircleLine size={18} /> Réactiver
            </Bouton>
          )}
          <Bouton
            variante="secondaire"
            disabled={envoi}
            onClick={() =>
              void agir(
                l.verifie ? "retirer_verification" : "verifier",
                l.verifie ? "Badge « vérifiée » retiré." : "Annonce marquée comme vérifiée.",
              )
            }
          >
            <RiShieldCheckLine size={18} />
            {l.verifie ? "Retirer le badge vérifié" : "Marquer comme vérifiée"}
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

function ListeAnnonces() {
  const parametres = useSearchParams();
  const [statut, setStatut] = useState(parametres.get("statut") ?? "");
  const [recherche, setRecherche] = useState("");
  const [q, setQ] = useState("");
  const [selection, setSelection] = useState<Logement | null>(null);
  const [message, setMessage] = useState("");

  const charger = useCallback(() => listerLogements({ statut, q }), [statut, q]);
  const { donnees, setDonnees, chargement, erreur, recharger } = useDonnees(charger, [] as Logement[]);

  // Lien direct depuis un signalement : /annonces?logement=12
  const logementDemande = Number(parametres.get("logement"));
  useEffect(() => {
    if (!logementDemande) return;
    let actif = true;
    lireLogement(logementDemande)
      .then((l) => {
        if (actif) setSelection(l);
      })
      .catch(() => {});
    return () => {
      actif = false;
    };
  }, [logementDemande]);

  return (
    <section className="page-entree">
      <EnTete
        titre="Annonces"
        sousTitre={chargement ? "Chargement en cours..." : `${donnees.length} annonce(s)`}
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
            placeholder="Titre, ville, propriétaire…"
            className="w-56 text-sm outline-none"
          />
        </form>
      </EnTete>
      <Filtres options={statutsLogement} valeur={statut} onChange={setStatut} />
      <Message texte={message} />
      <Message texte={erreur} erreur />

      <Carte>
        {chargement && donnees.length === 0 ? (
          <Squelette />
        ) : donnees.length === 0 ? (
          <Vide texte="Aucune annonce pour ces critères." />
        ) : (
          <div className="sans-barre overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-4">Annonce</th>
                  <th className="px-5 py-4">Propriétaire</th>
                  <th className="px-5 py-4">Prix</th>
                  <th className="px-5 py-4">Statut</th>
                  <th className="px-5 py-4">Indicateurs</th>
                  <th className="px-5 py-4">Mise à jour</th>
                  <th className="px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {donnees.map((l) => (
                  <tr key={l.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <ImageDistante src={l.photo} alt={l.titre} className="h-12 w-16 shrink-0 rounded-lg" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-800">{l.titre}</p>
                          <p className="truncate text-xs text-gray-500">
                            {typesLogement[l.type_logement]} · {[l.quartier, l.ville].filter(Boolean).join(", ")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{l.proprietaire.nom_complet}</td>
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {formaterPrix(l.prix, l.devise)}
                      <span className="text-xs text-gray-400"> / {periodicites[l.periodicite]}</span>
                    </td>
                    <td className="px-5 py-3">
                      <Badge texte={statutsLogement[l.statut] ?? l.statut} statut={l.statut} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {l.verifie && <Badge texte="Vérifiée" couleur="vert" />}
                        {l.a_visite_virtuelle && <Badge texte="360°" couleur="bleu" />}
                        {l.nombre_signalements > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                            <RiFlagLine size={13} /> {l.nombre_signalements}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{l.nombre_vues} vues</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{formaterDate(l.modifie_le)}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelection(l)}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-pri hover:bg-pri/10"
                      >
                        <RiEyeLine size={16} />
                        {l.statut === "en_attente" ? "Examiner" : "Ouvrir"}
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
        <Fiche
          logement={selection}
          onFermer={() => setSelection(null)}
          onModere={(modifie, texte) => {
            setMessage(texte);
            setSelection(null);
            setDonnees((liste) =>
              statut && modifie.statut !== statut
                ? liste.filter((l) => l.id !== modifie.id)
                : liste.map((l) => (l.id === modifie.id ? modifie : l)),
            );
          }}
        />
      )}
    </section>
  );
}

export default function AnnoncesPage() {
  return (
    <Suspense fallback={<Squelette />}>
      <ListeAnnonces />
    </Suspense>
  );
}
