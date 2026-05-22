import { createFileRoute } from "@tanstack/react-router";
import { StaffShell, Pill } from "@/components/staff/Shell";
import { QrCode, CheckCircle2, XCircle, Volume2, Bus, AlertTriangle, UserCheck } from "lucide-react";

export const Route = createFileRoute("/staff/checkin")({
  component: CheckinStaff,
});

function CheckinStaff() {
  const lista = [
    { nome: "Bianca Martins", tempo: "agora", onibus: "#01", poltrona: "12A", ok: true },
    { nome: "Lucas Pereira", tempo: "1 min", onibus: "#01", poltrona: "08B", ok: true },
    { nome: "Camila Reis", tempo: "ausente", onibus: "#01", poltrona: "15A", ok: false },
    { nome: "Rafa Tavares", tempo: "3 min", onibus: "#02", poltrona: "22C", ok: true },
  ];

  return (
    <StaffShell title="Check-in Operacional" subtitle="Embarque · 22/05 · 20:00">
      <div className="grid grid-cols-3 gap-2 mb-5">
        <Metric value="187" label="Embarcados" tone="green" />
        <Metric value="42" label="Ausentes" tone="red" />
        <Metric value="83" label="Aguardando" tone="yellow" />
      </div>

      <div className="relative glass rounded-3xl p-6 mb-5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neon-green/10 via-transparent to-neon-purple/10" />
        <div className="relative">
          <div className="aspect-square max-w-[260px] mx-auto rounded-2xl border-2 border-neon-green/40 grid place-items-center bg-background/60 relative overflow-hidden glow-primary">
            <div className="absolute inset-x-4 h-0.5 bg-neon-green animate-pulse-glow" style={{ top: "50%" }} />
            <QrCode className="size-32 text-neon-green/60" />
            <span className="absolute top-3 left-3 size-3 border-t-2 border-l-2 border-neon-green" />
            <span className="absolute top-3 right-3 size-3 border-t-2 border-r-2 border-neon-green" />
            <span className="absolute bottom-3 left-3 size-3 border-b-2 border-l-2 border-neon-green" />
            <span className="absolute bottom-3 right-3 size-3 border-b-2 border-r-2 border-neon-green" />
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">Aponte para o QR Code do passageiro</p>
          <div className="flex gap-2 mt-4">
            <button className="flex-1 h-10 rounded-xl glass text-xs font-bold flex items-center justify-center gap-2">
              <UserCheck className="size-4" /> Check-in manual
            </button>
            <button className="size-10 grid place-items-center rounded-xl glass">
              <Volume2 className="size-4 text-neon-green" />
            </button>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-3 mb-5 flex items-center gap-3 border border-yellow-400/40 bg-yellow-400/5">
        <AlertTriangle className="size-5 text-yellow-300 shrink-0" />
        <div className="flex-1 text-xs">
          <div className="font-bold text-yellow-200">2 passageiros com documentação pendente</div>
          <div className="text-muted-foreground">Solicite RG antes do embarque</div>
        </div>
      </div>

      <section className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Status dos ônibus</h3>
          <Pill tone="green">6 ativos</Pill>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { n: "#01", pax: "42/45", s: "green" },
            { n: "#02", pax: "38/45", s: "green" },
            { n: "#03", pax: "12/45", s: "yellow" },
            { n: "#04", pax: "00/45", s: "muted" },
          ].map((b) => (
            <div key={b.n} className="glass rounded-xl p-3 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-gradient-to-br from-neon-green/30 to-neon-purple/20 grid place-items-center">
                <Bus className="size-4 text-neon-green" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">Ônibus {b.n}</div>
                <div className="text-[10px] text-muted-foreground">{b.pax} pax</div>
              </div>
              <Pill tone={b.s as never}>•</Pill>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Embarques recentes</h3>
        <div className="glass rounded-2xl divide-y divide-border/60">
          {lista.map((p, i) => (
            <div key={i} className="p-3 flex items-center gap-3">
              {p.ok ? <CheckCircle2 className="size-5 text-neon-green" /> : <XCircle className="size-5 text-destructive" />}
              <div className="flex-1">
                <div className="text-sm font-semibold">{p.nome}</div>
                <div className="text-[10px] text-muted-foreground">Ônibus {p.onibus} · Poltrona {p.poltrona}</div>
              </div>
              <span className={`text-[10px] ${p.ok ? "text-neon-green" : "text-destructive"}`}>{p.tempo}</span>
            </div>
          ))}
        </div>
      </section>
    </StaffShell>
  );
}

function Metric({ value, label, tone }: { value: string; label: string; tone: "green" | "red" | "yellow" }) {
  const color = tone === "green" ? "text-neon-green" : tone === "red" ? "text-destructive" : "text-yellow-300";
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <div className={`text-2xl font-display font-black ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}
