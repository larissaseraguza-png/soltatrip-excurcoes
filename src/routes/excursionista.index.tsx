import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, StatusBadge } from "@/components/excursionista/Shell";
import { Calendar, MapPin, Users, Plus, Sparkles } from "lucide-react";

export const Route = createFileRoute("/excursionista/")({
  head: () => ({ meta: [{ title: "Minhas Excursões — SoltaTrip" }] }),
  component: MyTrips,
});

const trips = [
  {
    id: "tomorrowland-br",
    name: "Tomorrowland Brasil 2026",
    date: "12 Out · 22h",
    destination: "Itu, SP",
    status: "lotando" as const,
    pax: 38,
    vagas: 4,
    gradient: "from-fuchsia-600 via-purple-600 to-emerald-500",
  },
  {
    id: "universo-paralello",
    name: "Universo Paralello",
    date: "28 Dez · 18h",
    destination: "Pratigi, BA",
    status: "confirmada" as const,
    pax: 44,
    vagas: 0,
    gradient: "from-emerald-500 via-cyan-500 to-purple-600",
  },
  {
    id: "xxxperience",
    name: "XXXperience Festival",
    date: "15 Jan · 20h",
    destination: "Itapecerica, SP",
    status: "encerrada" as const,
    pax: 42,
    vagas: 0,
    gradient: "from-pink-500 via-rose-500 to-orange-400",
  },
];

function MyTrips() {
  return (
    <Shell title="Minhas Excursões" subtitle="3 viagens ativas">
      <div className="mb-6 glass rounded-3xl p-5 flex items-center gap-4">
        <div className="size-12 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-pink grid place-items-center glow-primary">
          <Sparkles className="size-6 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Receita total</p>
          <p className="text-2xl font-display font-bold text-gradient">R$ 124.350</p>
        </div>
      </div>

      <div className="space-y-4">
        {trips.map((t) => (
          <Link
            key={t.id}
            to="/excursionista/excursao/$id"
            params={{ id: t.id }}
            className="block glass rounded-3xl overflow-hidden hover:glow-primary transition group"
          >
            <div className={`h-32 bg-gradient-to-br ${t.gradient} relative`}>
              <div className="absolute inset-0 grid-bg opacity-40" />
              <div className="absolute top-3 right-3"><StatusBadge status={t.status} /></div>
              <div className="absolute bottom-3 left-4">
                <h3 className="font-display text-xl font-black text-white drop-shadow-lg">{t.name}</h3>
              </div>
            </div>
            <div className="p-4 grid grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-1.5"><Calendar className="size-3.5 text-neon-pink" /> {t.date}</div>
              <div className="flex items-center gap-1.5"><MapPin className="size-3.5 text-neon-green" /> {t.destination}</div>
              <div className="flex items-center gap-1.5"><Users className="size-3.5 text-neon-pink" /> {t.pax} pax</div>
            </div>
            <div className="px-4 pb-4">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-neon-purple to-neon-pink"
                  style={{ width: `${(t.pax / (t.pax + t.vagas || 1)) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {t.vagas > 0 ? `${t.vagas} vagas restantes` : "Lotação máxima"}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <button className="fixed bottom-28 right-5 z-30 size-16 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink glow-primary grid place-items-center animate-pulse-glow">
        <Plus className="size-7 text-primary-foreground" />
      </button>
    </Shell>
  );
}
