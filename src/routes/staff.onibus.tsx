import { createFileRoute } from "@tanstack/react-router";
import { StaffShell, Pill } from "@/components/staff/Shell";
import { Bus, MapPin, User, Plus, Shuffle } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/staff/onibus")({
  component: OnibusStaff,
});

const ONIBUS = [
  { n: "#01", pax: 42, total: 45, motorista: "Sr. Antônio", loc: "Av. Paulista", s: "green", label: "em rota" },
  { n: "#02", pax: 38, total: 45, motorista: "Sr. Carlos", loc: "Rod. Anhanguera", s: "green", label: "em rota" },
  { n: "#03", pax: 12, total: 45, motorista: "Sr. Joaquim", loc: "Garagem SP", s: "yellow", label: "preparando" },
  { n: "#04", pax: 0, total: 45, motorista: "—", loc: "Standby", s: "muted", label: "standby" },
];

function OnibusStaff() {
  const [sel, setSel] = useState("#01");
  const onibus = ONIBUS.find((o) => o.n === sel)!;
  const seats = Array.from({ length: 45 }, (_, i) => i + 1);

  return (
    <StaffShell title="Controle de Ônibus" subtitle="6 frotas ativas">
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 mb-4">
        {ONIBUS.map((o) => (
          <button
            key={o.n}
            onClick={() => setSel(o.n)}
            className={`min-w-[160px] glass rounded-2xl p-3 text-left transition ${
              sel === o.n ? "ring-2 ring-neon-green glow-primary" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Bus className="size-5 text-neon-green" />
              <Pill tone={o.s as never}>{o.label}</Pill>
            </div>
            <div className="font-display font-black text-lg">Ônibus {o.n}</div>
            <div className="text-[10px] text-muted-foreground">{o.pax}/{o.total} passageiros</div>
          </button>
        ))}
        <button className="min-w-[120px] glass rounded-2xl p-3 flex items-center justify-center gap-2 text-xs font-bold border-2 border-dashed border-border/60">
          <Plus className="size-4" /> Novo
        </button>
      </div>

      <div className="glass rounded-2xl p-4 mb-5">
        <div className="flex justify-between mb-3">
          <div>
            <h3 className="font-display font-bold">Ônibus {onibus.n}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="size-3" /> {onibus.loc}</p>
          </div>
          <Pill tone={onibus.s as never}>{onibus.label}</Pill>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-background/40 rounded-xl p-2">
            <div className="text-lg font-bold text-neon-green">{onibus.pax}</div>
            <div className="text-[10px] text-muted-foreground">Pax</div>
          </div>
          <div className="bg-background/40 rounded-xl p-2">
            <div className="text-lg font-bold text-neon-pink">{onibus.total - onibus.pax}</div>
            <div className="text-[10px] text-muted-foreground">Vagas</div>
          </div>
          <div className="bg-background/40 rounded-xl p-2">
            <div className="text-lg font-bold text-neon-purple">{Math.round((onibus.pax / onibus.total) * 100)}%</div>
            <div className="text-[10px] text-muted-foreground">Ocupação</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 p-2 rounded-xl bg-background/40">
          <User className="size-4 text-neon-green" />
          <div className="text-xs flex-1">Motorista</div>
          <div className="text-sm font-semibold">{onibus.motorista}</div>
        </div>
      </div>

      <section className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Mapa de assentos</h3>
          <button className="text-xs flex items-center gap-1 text-neon-green font-bold">
            <Shuffle className="size-3.5" /> Reorganizar
          </button>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="bg-background/40 rounded-xl p-3 mb-3 text-center text-[10px] text-muted-foreground">
            🚗 FRENTE — Motorista
          </div>
          <div className="grid grid-cols-5 gap-2">
            {seats.map((s) => {
              const occupied = s <= onibus.pax;
              const isAisle = s % 5 === 3;
              return (
                <div key={s} className={isAisle ? "col-span-1 invisible" : ""}>
                  {!isAisle && (
                    <div className={`aspect-square rounded-lg grid place-items-center text-[10px] font-bold border ${
                      occupied
                        ? "bg-gradient-to-br from-neon-green/40 to-neon-purple/30 border-neon-green/60 text-neon-green glow-primary"
                        : "bg-background/40 border-border/60 text-muted-foreground"
                    }`}>
                      {s}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="size-2 rounded bg-neon-green" /> Ocupado</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded bg-muted" /> Livre</span>
          </div>
        </div>
      </section>

      <button className="w-full h-12 rounded-2xl bg-gradient-to-br from-neon-green to-neon-purple glow-primary text-primary-foreground font-bold flex items-center justify-center gap-2">
        <Shuffle className="size-4" /> Divisão automática de passageiros
      </button>
    </StaffShell>
  );
}
