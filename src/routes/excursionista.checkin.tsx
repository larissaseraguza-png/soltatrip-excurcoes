import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/excursionista/Shell";
import { QrCode, Check, X, ScanLine, UserCheck } from "lucide-react";

export const Route = createFileRoute("/excursionista/checkin")({
  head: () => ({ meta: [{ title: "Check-in — SoltaTrip" }] }),
  component: CheckIn,
});

const list = [
  { name: "Marina Costa", seat: "01A", in: true },
  { name: "Diego Almeida", seat: "01B", in: true },
  { name: "Júlia Ferreira", seat: "02A", in: false },
  { name: "Lucas Pereira", seat: "02B", in: true },
  { name: "Ana Beatriz", seat: "03A", in: false },
  { name: "Rafael Souza", seat: "03B", in: true },
];

function CheckIn() {
  return (
    <Shell title="Check-in" subtitle="Embarque — Tomorrowland BR" back="/excursionista">
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="glass rounded-2xl p-4 border-neon-green/30">
          <div className="flex items-center gap-2 text-neon-green mb-1">
            <UserCheck className="size-4" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Embarcados</span>
          </div>
          <p className="font-display text-3xl font-black text-neon-green glow-text">28</p>
        </div>
        <div className="glass rounded-2xl p-4 border-destructive/30">
          <div className="flex items-center gap-2 text-destructive mb-1">
            <X className="size-4" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Ausentes</span>
          </div>
          <p className="font-display text-3xl font-black text-destructive">14</p>
        </div>
      </div>

      <div className="relative rounded-3xl overflow-hidden mb-5 aspect-square max-h-72 mx-auto bg-gradient-to-br from-neon-green/20 via-background to-neon-purple/20 border border-neon-green/40">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute inset-8 border-2 border-neon-green rounded-3xl">
          <div className="absolute -top-1 -left-1 size-8 border-t-4 border-l-4 border-neon-green rounded-tl-3xl" />
          <div className="absolute -top-1 -right-1 size-8 border-t-4 border-r-4 border-neon-green rounded-tr-3xl" />
          <div className="absolute -bottom-1 -left-1 size-8 border-b-4 border-l-4 border-neon-green rounded-bl-3xl" />
          <div className="absolute -bottom-1 -right-1 size-8 border-b-4 border-r-4 border-neon-green rounded-br-3xl" />
        </div>
        <div className="absolute inset-0 grid place-items-center">
          <QrCode className="size-20 text-neon-green animate-pulse-glow" />
        </div>
        <div className="absolute inset-x-8 top-1/2 h-0.5 bg-neon-green shadow-[0_0_20px_var(--neon-green)] animate-pulse" />
        <p className="absolute bottom-4 inset-x-0 text-center text-xs text-neon-green font-bold uppercase tracking-wider flex items-center justify-center gap-2">
          <ScanLine className="size-4" /> Aproxime o QR Code
        </p>
      </div>

      <button className="w-full h-12 rounded-2xl glass font-bold mb-5 flex items-center justify-center gap-2">
        <Check className="size-4 text-neon-green" /> Confirmar manualmente
      </button>

      <h3 className="font-display font-bold text-sm mb-3 text-muted-foreground uppercase tracking-wider">
        Status passageiros
      </h3>
      <div className="space-y-2">
        {list.map((p) => (
          <div key={p.seat} className="glass rounded-2xl p-3 flex items-center gap-3">
            <span className="text-[10px] px-2 py-0.5 rounded bg-neon-purple/30 text-neon-pink font-bold">
              {p.seat}
            </span>
            <p className="flex-1 text-sm font-medium">{p.name}</p>
            {p.in ? (
              <span className="flex items-center gap-1 text-neon-green text-xs font-bold">
                <Check className="size-4" /> Embarcado
              </span>
            ) : (
              <button className="text-xs font-bold text-muted-foreground px-3 py-1 rounded-full border border-border">
                Pendente
              </button>
            )}
          </div>
        ))}
      </div>
    </Shell>
  );
}
