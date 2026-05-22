import { createFileRoute } from "@tanstack/react-router";
import { StaffShell, Pill } from "@/components/staff/Shell";
import { Plus, AlertTriangle, Clock, CheckCircle2, Filter } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/staff/suporte")({
  component: Suporte,
});

const OCC = [
  { t: "Atraso ônibus #03", desc: "Trânsito intenso na Marginal Tietê", prio: "alta", status: "aberta", time: "5 min", tone: "red" },
  { t: "Passageiro sem documento", desc: "Bianca M. esqueceu RG, providenciar foto", prio: "média", status: "andamento", time: "12 min", tone: "yellow" },
  { t: "PIX não confirmado", desc: "Lucas P. - R$ 450 não processado", prio: "média", status: "andamento", time: "25 min", tone: "yellow" },
  { t: "Banheiro ônibus #01", desc: "Manutenção solicitada", prio: "baixa", status: "resolvida", time: "1h", tone: "green" },
  { t: "Reembolso solicitado", desc: "Marina S. - desistência por motivo médico", prio: "alta", status: "andamento", time: "2h", tone: "red" },
];

const FILTERS = ["Todas", "Abertas", "Em andamento", "Resolvidas", "Alta prioridade"];

function Suporte() {
  const [f, setF] = useState("Todas");
  return (
    <StaffShell title="Suporte / Ocorrências" subtitle="Gestão operacional em tempo real">
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="glass rounded-2xl p-3 text-center">
          <AlertTriangle className="size-5 text-destructive mx-auto mb-1" />
          <div className="text-xl font-display font-black text-destructive">3</div>
          <div className="text-[10px] text-muted-foreground uppercase">Abertas</div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <Clock className="size-5 text-yellow-300 mx-auto mb-1" />
          <div className="text-xl font-display font-black text-yellow-300">4</div>
          <div className="text-[10px] text-muted-foreground uppercase">Em andamento</div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <CheckCircle2 className="size-5 text-neon-green mx-auto mb-1" />
          <div className="text-xl font-display font-black text-neon-green">28</div>
          <div className="text-[10px] text-muted-foreground uppercase">Resolvidas</div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 mb-4">
        <button className="size-9 shrink-0 grid place-items-center rounded-full glass">
          <Filter className="size-4" />
        </button>
        {FILTERS.map((x) => (
          <button
            key={x}
            onClick={() => setF(x)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition ${
              f === x
                ? "bg-neon-green text-background border-neon-green glow-primary"
                : "glass border-border/60 text-muted-foreground"
            }`}
          >
            {x}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {OCC.map((o, i) => (
          <div key={i} className="glass rounded-2xl p-4">
            <div className="flex items-start gap-3 mb-2">
              <div className={`size-10 rounded-xl grid place-items-center shrink-0 ${
                o.tone === "red" ? "bg-destructive/20 text-destructive" :
                o.tone === "yellow" ? "bg-yellow-400/20 text-yellow-300" :
                "bg-neon-green/20 text-neon-green"
              }`}>
                <AlertTriangle className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-sm flex-1 truncate">{o.t}</h3>
                  <span className="text-[10px] text-muted-foreground">{o.time}</span>
                </div>
                <p className="text-xs text-muted-foreground">{o.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Pill tone={o.prio === "alta" ? "red" : o.prio === "média" ? "yellow" : "muted"}>
                prioridade {o.prio}
              </Pill>
              <Pill tone={o.status === "aberta" ? "red" : o.status === "andamento" ? "yellow" : "green"}>
                {o.status}
              </Pill>
              <button className="ml-auto h-8 px-3 rounded-lg bg-gradient-to-br from-neon-green/30 to-neon-purple/20 text-neon-green text-xs font-bold">
                Resolver
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
