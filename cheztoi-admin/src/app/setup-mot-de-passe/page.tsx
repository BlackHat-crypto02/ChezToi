import { Suspense } from "react";
import EcranAuth from "@/components/EcranAuth";
import FormulaireSetup from "@/components/FormulaireSetup";

export default function SetupMotDePassePage() {
  return (
    <EcranAuth>
      <div className="montee-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Bienvenue dans l’équipe 🎉
        </h1>
        <p className="mt-2 text-gray-500">
          Choisissez votre mot de passe pour activer votre accès administrateur.
        </p>
      </div>
      <div className="montee-2 mt-8">
        <Suspense
          fallback={<p className="text-center text-sm text-gray-500">Chargement...</p>}
        >
          <FormulaireSetup />
        </Suspense>
      </div>
    </EcranAuth>
  );
}
