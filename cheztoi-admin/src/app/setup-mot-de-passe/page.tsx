import { Suspense } from "react";
import Image from "next/image";
import FormulaireSetup from "@/components/FormulaireSetup";

export default function SetupMotDePassePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-pri px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl sm:p-10">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo-cheztoi.png"
            alt="Logo ChezToi"
            width={72}
            height={72}
            className="h-18 w-18 object-contain"
            priority
          />
          <p className="mt-4 text-sm font-semibold text-pri">Administration ChezToi</p>
        </div>
        <div className="mt-6">
          <Suspense
            fallback={
              <p className="text-center text-sm text-gray-500">Chargement...</p>
            }
          >
            <FormulaireSetup />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
