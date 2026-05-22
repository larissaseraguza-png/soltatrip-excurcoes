import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, Pill } from "@/components/passageiro/Shell";
import { Calendar, MapPin, ChevronRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/passageiro/")({
  component: MinhasViagens,
});

const viagens = [
  {
    id: "1",
    nome: "Tomorrowland Brasil",
    cidade: "Itu, SP",
    data: "12 Out 2026",
    status: "confirmado" as const,
    pagamento: "pago" as const,
    gradient: "from-neon-purple via-neon-pink to-neon-green",
    tag: "Próxima viagem",
  },
  {
    id: "2",
    nome: "Universo Paralello",
    cidade: "Pratigi, BA",
    data: "29 Dez 2026",
    status: "pendente" as const,
    pagamento: "pendente" as const,
    gradient: "from-neon-green via-neon-purple to-neon-pink",
  },
  {
    id: "3",
    nome: "XXXPERIENCE",
    cidade: "Itu, SP",
    data: "20 Fev 2025",
    status: "cancelado" as const,
    pagamento: "pago" as const,
    gradient: "from-muted to-muted",
  },
];

function MinhasViagens() {
  return (
    <Shell title="Minhas viagens" subtitle="Suas excursões SoltaTrip">
      <div className="mb-6 glass rounded-3xl p-5 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 size-40 rounded-full bg-neon-pink/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <Sparkles className="size-5 text-neon-pink" />
          <div>
            <p className="text-xs text-muted-foreground">Bem-vindo de volta</p>
            <h2 className="font-display font-bold text-xl">Pronto pra próxima? 🚌</h2>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {viagens.map((v) => (
          <Link
            key={v.id}
            to="/passageiro/viagem/$id"
            params={{ id: v.id }}
            className="block group"
          >
            <article className="glass rounded-3xl overflow-hidden hover:glow-primary transition">
              <div className={`relative h-32 bg-gradient-to-br ${v.gradient}`}>
                <div className="absolute inset-0 grid-bg opacity-40" />
                {v.tag && (
                  <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full bg-background/60 backdrop-blur border border-white/20">
                    {v.tag}
                  </span>
                )}
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <Pill tone={v.status === "confirmado" ? "green" : v.status === "pendente" ? "yellow" : "red"}>
                    {v.status}
                  </Pill>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-display font-bold text-lg leading-tight">{v.nome}</h3>
                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4" /> {v.cidade}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-4" /> {v.data}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Pill tone={v.pagamento === "pago" ? "green" : "yellow"}>
                    pagamento {v.pagamento}
                  </Pill>
                  <span className="flex items-center gap-1 text-sm text-neon-pink font-semibold group-hover:gap-2 transition-all">
                    Ver detalhes <ChevronRight className="size-4" />
                  </span>
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
