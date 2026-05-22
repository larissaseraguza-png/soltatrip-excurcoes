import { createFileRoute } from "@tanstack/react-router";
import { StaffShell, Pill } from "@/components/staff/Shell";
import { TrendingUp, TrendingDown, FileDown, FileSpreadsheet, Wallet, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/staff/financeiro")({
  component: FinanceiroStaff,
});

function FinanceiroStaff() {
  const bars = [40, 65, 55, 80, 90, 70, 95, 88, 72, 100, 85, 78];
  const max = Math.max(...bars);

  const cards = [
    { label: "Arrecadado", value: "R$ 84.320", trend: "+12%", tone: "green", icon: TrendingUp },
    { label: "Pendente", value: "R$ 12.480", trend: "-3%", tone: "yellow", icon: Wallet },
    { label: "Despesas", value: "R$ 21.700", trend: "+5%", tone: "pink", icon: TrendingDown },
    { label: "Lucro estimado", value: "R$ 50.140", trend: "+18%", tone: "purple", icon: TrendingUp },
  ] as const;

  const recentes = [
    { who: "Lucas Pereira", method: "PIX", value: "R$ 450", time: "agora", s: "pago" },
    { who: "Camila Reis", method: "PIX", value: "R$ 700", time: "12 min", s: "pago" },
    { who: "Marina Souza", method: "Boleto", value: "R$ 350", time: "1h", s: "pendente" },
    { who: "Rafa Tavares", method: "PIX", value: "R$ 700", time: "2h", s: "pago" },
    { who: "Pedro L.", method: "PIX", value: "R$ 250", time: "3h", s: "cancelado" },
  ] as const;

  return (
    <StaffShell title="Financeiro Staff" subtitle="Controle de caixa · multi-excursão">
      <div className="grid grid-cols-2 gap-3 mb-5">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-2xl p-4">
            <c.icon className={`size-4 mb-2 ${c.tone === "green" ? "text-neon-green" : c.tone === "pink" ? "text-neon-pink" : c.tone === "yellow" ? "text-yellow-300" : "text-neon-purple"}`} />
            <div className="text-lg font-display font-black">{c.value}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              {c.label} <span className="text-neon-green">{c.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <section className="glass rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold">Receita últimos 12 dias</h3>
            <p className="text-xs text-muted-foreground">Pagamentos confirmados</p>
          </div>
          <Pill tone="green">+R$ 18k</Pill>
        </div>
        <div className="flex items-end gap-1.5 h-32">
          {bars.map((v, i) => (
            <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-neon-green/40 to-neon-purple glow-primary"
              style={{ height: `${(v / max) * 100}%` }} />
          ))}
        </div>
      </section>

      <section className="mb-5">
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Por excursão</h3>
        <div className="space-y-2">
          {[
            { name: "Tomorrowland BR", v: "R$ 42.100", p: 86 },
            { name: "Universo Paralello", v: "R$ 28.420", p: 64 },
            { name: "Festival Doctor Hannibal", v: "R$ 13.800", p: 38 },
          ].map((e, i) => (
            <div key={i} className="glass rounded-xl p-3">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold">{e.name}</span>
                <span className="text-sm font-bold text-neon-green">{e.v}</span>
              </div>
              <div className="h-1.5 rounded-full bg-background/60 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-neon-green to-neon-purple glow-primary" style={{ width: `${e.p}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-5">
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Pagamentos recentes</h3>
        <div className="glass rounded-2xl divide-y divide-border/60">
          {recentes.map((p, i) => (
            <div key={i} className="p-3 flex items-center gap-3">
              <div className="size-9 rounded-xl bg-gradient-to-br from-neon-green/30 to-neon-purple/20 grid place-items-center">
                <Wallet className="size-4 text-neon-green" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{p.who}</div>
                <div className="text-[10px] text-muted-foreground">{p.method} · {p.time}</div>
              </div>
              <div className="text-sm font-bold">{p.value}</div>
              <Pill tone={p.s === "pago" ? "green" : p.s === "pendente" ? "yellow" : "red"}>{p.s}</Pill>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <button className="h-11 rounded-xl glass text-xs font-bold flex items-center justify-center gap-1.5">
          <FileDown className="size-4" /> PDF
        </button>
        <button className="h-11 rounded-xl glass text-xs font-bold flex items-center justify-center gap-1.5">
          <FileSpreadsheet className="size-4" /> Excel
        </button>
        <button className="h-11 rounded-xl bg-gradient-to-br from-neon-green to-neon-purple glow-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5">
          <RefreshCw className="size-4" /> Sync
        </button>
      </section>
    </StaffShell>
  );
}
