import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/excursionista/Shell";
import { TrendingUp, Download, FileText, ArrowUpRight, Clock } from "lucide-react";

export const Route = createFileRoute("/excursionista/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — SoltaTrip" }] }),
  component: Finance,
});

const recentes = [
  { name: "Marina Costa", method: "PIX", value: "R$ 480", time: "há 2min", status: "pago" },
  { name: "Diego Almeida", method: "PIX", value: "R$ 480", time: "há 18min", status: "pago" },
  { name: "Lucas Pereira", method: "Cartão", value: "R$ 480", time: "há 1h", status: "pago" },
  { name: "Júlia Ferreira", method: "PIX", value: "R$ 240", time: "há 3h", status: "parcial" },
];

const bars = [40, 65, 35, 80, 55, 95, 70, 88, 62, 100, 75, 92];

function Finance() {
  return (
    <Shell title="Financeiro" subtitle="Tomorrowland BR" back="/excursionista/excursao/tomorrowland-br">
      <div className="glass rounded-3xl p-5 mb-4 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 size-40 rounded-full bg-neon-pink/30 blur-3xl" />
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Total arrecadado</p>
        <p className="text-4xl font-display font-black text-gradient mt-1">R$ 20.160</p>
        <div className="flex items-center gap-1 mt-2 text-neon-green text-xs font-medium">
          <ArrowUpRight className="size-3.5" /> +12% essa semana
        </div>

        <div className="flex items-end gap-1 h-20 mt-5">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-neon-purple to-neon-pink opacity-80"
              style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Mini label="Pendente" value="R$ 2.880" tone="text-yellow-300" />
        <Mini label="Pagamentos" value="42" tone="text-neon-green" />
        <Mini label="PIX hoje" value="18" tone="text-neon-pink" />
      </div>

      <div className="flex gap-3 mb-5">
        <button className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground font-bold glow-primary flex items-center justify-center gap-2">
          <FileText className="size-4" /> Relatório
        </button>
        <button className="flex-1 h-12 rounded-2xl glass font-bold flex items-center justify-center gap-2">
          <Download className="size-4" /> Exportar
        </button>
      </div>

      <h3 className="font-display font-bold text-sm mb-3 text-muted-foreground uppercase tracking-wider">
        Pagamentos recentes
      </h3>
      <div className="space-y-3">
        {recentes.map((r, i) => (
          <div key={i} className="glass rounded-2xl p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-neon-green/15 grid place-items-center">
              <TrendingUp className="size-4 text-neon-green" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{r.name}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                {r.method} · <Clock className="size-3" /> {r.time}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display font-bold text-sm">{r.value}</p>
              <p className={`text-[10px] uppercase font-bold ${
                r.status === "pago" ? "text-neon-green" : "text-yellow-300"
              }`}>{r.status}</p>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="glass rounded-2xl p-3">
      <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</p>
      <p className={`font-display font-bold text-lg ${tone}`}>{value}</p>
    </div>
  );
}
