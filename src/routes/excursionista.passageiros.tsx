import { createFileRoute } from "@tanstack/react-router";
import { Shell, StatusBadge } from "@/components/excursionista/Shell";
import { Search, Plus, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/excursionista/passageiros")({
  head: () => ({ meta: [{ title: "Passageiros — SoltaTrip" }] }),
  component: Pax,
});

const pax = [
  { name: "Marina Costa", seat: "01A", city: "São Paulo", phone: "+55 11 9..921", status: "pago" as const, initials: "MC" },
  { name: "Diego Almeida", seat: "01B", city: "Campinas", phone: "+55 19 9..544", status: "pago" as const, initials: "DA" },
  { name: "Júlia Ferreira", seat: "02A", city: "Sorocaba", phone: "+55 15 9..713", status: "pendente" as const, initials: "JF" },
  { name: "Lucas Pereira", seat: "02B", city: "São Paulo", phone: "+55 11 9..220", status: "pago" as const, initials: "LP" },
  { name: "Ana Beatriz", seat: "03A", city: "Jundiaí", phone: "+55 11 9..880", status: "cancelado" as const, initials: "AB" },
  { name: "Rafael Souza", seat: "03B", city: "São Paulo", phone: "+55 11 9..001", status: "pago" as const, initials: "RS" },
  { name: "Carolina Lima", seat: "04A", city: "Santos", phone: "+55 13 9..456", status: "pendente" as const, initials: "CL" },
];

function Pax() {
  return (
    <Shell title="Passageiros" subtitle="42 confirmados · 4 vagas" back="/excursionista">
      <div className="glass rounded-2xl flex items-center gap-3 px-4 py-3 mb-4">
        <Search className="size-4 text-muted-foreground" />
        <input
          placeholder="Buscar nome, CPF ou poltrona…"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {["Todos", "Pagos", "Pendentes", "Cancelados"].map((f, i) => (
          <button
            key={f}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              i === 0
                ? "bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground glow-primary"
                : "glass text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {pax.map((p) => (
          <div key={p.seat} className="glass rounded-2xl p-4 flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-pink grid place-items-center font-bold text-primary-foreground">
              {p.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm truncate">{p.name}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon-green/20 text-neon-green font-bold">
                  {p.seat}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="size-3" /> {p.city}</span>
                <span className="flex items-center gap-1"><Phone className="size-3" /> {p.phone}</span>
              </div>
            </div>
            <StatusBadge status={p.status} />
          </div>
        ))}
      </div>

      <button className="fixed bottom-28 right-5 z-30 h-14 px-5 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink glow-primary flex items-center gap-2 text-primary-foreground font-bold animate-pulse-glow">
        <Plus className="size-5" /> Adicionar
      </button>
    </Shell>
  );
}
