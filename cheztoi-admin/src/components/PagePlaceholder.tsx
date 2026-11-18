import type { ReactNode } from "react";

type PagePlaceholderProps = {
  icone: ReactNode;
};

/// Page simple en attendant le contenu définitif de chaque section.
/// Le titre et le sous-titre sont affichés dans la barre du haut.
export default function PagePlaceholder({ icone }: PagePlaceholderProps) {
  return (
    <section>
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-pri shadow-sm">
          {icone}
        </div>
      </div>
    </section>
  );
}
