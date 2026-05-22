import { createFileRoute, Link } from "@tanstack/react-router";
import { StaffShell, Pill } from "@/components/staff/Shell";
import { Search, Filter, MessageCircle, Edit3, Trash2, ArrowRightLeft, Plus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/staff/passageiros")({
  component: PassageirosStaff,
});

const PAX = [
  { id: "p1", nome: "Bianca Martins", cidade: "São Paulo", tel: "(11) 9 9821-4422", status: "embarcado", tone: "green", poltrona: "12A", onibus: "#01", tag: "VIP" },
  { id: "p2", nome: "Lucas Pereira", cidade: "Campinas", tel: "(19) 9 8741-1003", status: "pago", tone: "green", poltrona: "08B", onibus: "#01", tag: null },
  { id: "p3", nome: "Marina Souza", cidade: "Santos", tel: "(13) 9 9311-2098", status: "pendente", tone: "yellow", poltrona: "—", onibus: "—", tag: null },
  { id: "p4", nome: "Diego Rocha", cidade: "São Paulo", tel: "(11) 9 9012-8821", status: "staff", tone: "purple", poltrona: "01A", onibus: "#02", tag: "STAFF" },
  { id: "p5", nome: "Rafa Tavares", cidade: "Sorocaba", tel: "(15) 9 8112-7700", status: "embarcado", tone: "green", poltrona: "22C", onibus: "#02", tag: null },
  { id: "p6", nome: "Camila Reis", cidade: "São Paulo", tel: "(11) 9 9544-1190", status: "ausente", tone: "red", poltrona: "15A", onibus: "#01", tag: null },
] as const;

const FILTERS = ["Todos", "Pagos", "Pendentes", "Embarcados", "Ausentes", "VIP", "Staff"];

function PassageirosStaff() {
  const [filter, setFilter] = useState("Todos");
  return (
    <StaffShell title="Controle de Passageiros" subtitle="312 cadastrados · 248 confirmados">
      <div className="glass rounded-2xl p-3 flex items-center gap-2 mb-4">
        <Search className="size-4 text-muted-foreground ml-2" />
        <input placeholder="Buscar por nome, CPF ou telefone…" className="flex-1 bg-transparent outline-none text-sm" />
        <button className="size-9 grid place-items-center rounded-xl bg-gradient-to-br from-neon-green to-neon-purple glow-primary">
          <Filter className="size-4 text-primary-foreground" />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition ${
              filter === f
                ? "bg-neon-green text-background border-neon-green glow-primary"
                : "glass border-border/60 text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {PAX.map((p) => (
          <div key={p.id} className="glass rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-12 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink grid place-items-center font-display font-black text-primary-foreground">
                {p.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <Link to="/staff/passageiro/$id" params={{ id: p.id }} className="font-semibold truncate block hover:text-neon-green transition">
                  {p.nome}
                </Link>
                <div className="text-xs text-muted-foreground">{p.cidade} · {p.tel}</div>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <Pill tone={p.tone as never}>{p.status}</Pill>
                {p.tag && <Pill tone={p.tag === "VIP" ? "pink" : "purple"}>{p.tag}</Pill>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="bg-background/40 rounded-lg p-2">
                <div className="text-[10px] text-muted-foreground uppercase">Ônibus</div>
                <div className="font-bold text-neon-green">{p.onibus}</div>
              </div>
              <div className="bg-background/40 rounded-lg p-2">
                <div className="text-[10px] text-muted-foreground uppercase">Poltrona</div>
                <div className="font-bold text-neon-pink">{p.poltrona}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 h-9 rounded-xl glass text-xs font-semibold flex items-center justify-center gap-1.5">
                <Edit3 className="size-3.5" /> Editar
              </button>
              <button className="flex-1 h-9 rounded-xl glass text-xs font-semibold flex items-center justify-center gap-1.5">
                <ArrowRightLeft className="size-3.5" /> Trocar
              </button>
              <button className="flex-1 h-9 rounded-xl bg-gradient-to-br from-neon-green/30 to-neon-purple/20 text-neon-green text-xs font-semibold flex items-center justify-center gap-1.5">
                <MessageCircle className="size-3.5" /> Msg
              </button>
              <button className="size-9 grid place-items-center rounded-xl bg-destructive/20 text-destructive">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="fixed bottom-24 right-5 size-14 rounded-full bg-gradient-to-br from-neon-green to-neon-purple glow-primary grid place-items-center shadow-2xl">
        <Plus className="size-6 text-primary-foreground" />
      </button>
    </StaffShell>
  );
}
