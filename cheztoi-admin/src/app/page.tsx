import {
  RiBuilding3Line,
  RiCalendarCheckLine,
  RiFlagLine,
  RiTeamLine,
} from "@remixicon/react";

export default function Home() {
  const stats = [
    {
      label: "Biens",
      value: "24",
      icone: RiBuilding3Line,
      couleur: "bg-gray-100 text-pri",
    },
    {
      label: "Utilisateurs",
      value: "138",
      icone: RiTeamLine,
      couleur: "bg-gray-100 text-pri-d",
    },
    {
      label: "Réservations",
      value: "9",
      icone: RiCalendarCheckLine,
      couleur: "bg-gray-100 text-pri",
    },
    {
      label: "Signalements",
      value: "2",
      icone: RiFlagLine,
      couleur: "bg-gray-100 text-pri-d",
    },
  ];

  return (
    <section>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icone = stat.icone;
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.couleur}`}
              >
                <Icone size={22} />
              </div>
              <p className="mt-5 text-sm text-gray-500">{stat.label}</p>
              <p className="mt-1 text-3xl font-extrabold text-pri">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
