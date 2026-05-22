import { useMemo } from "react";

export type SeatState = "livre" | "ocupado" | "reservado" | "selecionado";

export type SeatInfo = {
  numero: number;
  state: SeatState;
  passageiro?: string;
};

type Props = {
  total: number;
  taken: Record<string, { pago: boolean; nome: string }>; // key = assento (string)
  selected?: string | null;
  onSelect?: (assento: string) => void;
  columns?: number; // default 4 (2+aisle+2)
};

/**
 * SeatMap — visual do ônibus.
 * - livre: disponível para escolha
 * - ocupado: passageiro cadastrado, pagamento pendente
 * - reservado: passageiro com pagamento confirmado
 * - selecionado: seleção corrente (apenas modo interativo)
 */
export function SeatMap({ total, taken, selected, onSelect, columns = 4 }: Props) {
  const seats = useMemo(() => Array.from({ length: total }, (_, i) => i + 1), [total]);
  const interactive = !!onSelect;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="bg-background/40 rounded-xl p-2 mb-3 text-center text-[10px] text-muted-foreground">
        🚗 FRENTE — Motorista
      </div>
      <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${columns + 1}, minmax(0, 1fr))` }}>
        {seats.map((n) => {
          const key = String(n);
          const t = taken[key];
          const isSelected = selected === key;
          const state: SeatState = isSelected
            ? "selecionado"
            : t
              ? t.pago
                ? "reservado"
                : "ocupado"
              : "livre";

          const cls =
            state === "selecionado"
              ? "bg-gradient-to-br from-neon-pink to-neon-purple border-neon-pink text-primary-foreground glow-primary"
              : state === "reservado"
                ? "bg-neon-green/30 border-neon-green/60 text-neon-green"
                : state === "ocupado"
                  ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
                  : "bg-background/40 border-border/60 text-muted-foreground hover:border-neon-pink/60";

          const disabled = !interactive || (!!t && !isSelected);

          // Inserir corredor depois da metade
          const cellIndex = (n - 1) % columns;
          const aisleAfter = cellIndex === Math.floor(columns / 2) - 1;

          return (
            <div key={n} className="contents">
              <button
                type="button"
                disabled={disabled}
                title={t ? `${t.nome}${t.pago ? " (pago)" : " (pendente)"}` : `Assento ${n}`}
                onClick={() => !disabled && onSelect?.(key)}
                className={`aspect-square rounded-lg grid place-items-center text-[10px] font-bold border transition ${cls} ${
                  disabled && !isSelected ? "cursor-not-allowed opacity-90" : "cursor-pointer"
                }`}
              >
                {n}
              </button>
              {aisleAfter && <div aria-hidden className="aspect-square" />}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-3 text-[10px] text-muted-foreground">
        <Legend color="bg-background/40 border border-border/60" label="Livre" />
        <Legend color="bg-yellow-500/40" label="Ocupado" />
        <Legend color="bg-neon-green/60" label="Reservado" />
        {interactive && <Legend color="bg-gradient-to-br from-neon-pink to-neon-purple" label="Selecionado" />}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`size-2.5 rounded ${color}`} /> {label}
    </span>
  );
}
