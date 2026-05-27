import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, ChevronRight } from "lucide-react";
import { useStaffExcursao } from "@/hooks/use-staff-excursao";

/**
 * Banner mostrado no topo de cada sub-página do staff:
 * - mostra a festa selecionada
 * - permite trocar de festa indo ao painel /staff
 */
export function FestaSelectorBanner() {
  const { excursao } = useStaffExcursao();
  if (!excursao) return null;
  return (
    <Link
      to="/staff"
      className="glass rounded-2xl p-3 mb-3 flex items-center gap-3 border border-neon-purple/30 bg-neon-purple/5 hover:border-neon-purple/60 transition"
    >
      <div
        className="size-9 rounded-xl shrink-0"
        style={{ background: `linear-gradient(135deg, ${excursao.cor ?? "#a855f7"}, #22d3a4)` }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Festa atual</div>
        <div className="text-sm font-bold truncate">{excursao.titulo}</div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
          {excursao.destino && (
            <span className="flex items-center gap-1"><MapPin className="size-3" />{excursao.destino}</span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            {new Date(excursao.data_evento).toLocaleDateString("pt-BR")}
          </span>
        </div>
      </div>
      <div className="text-[10px] text-neon-purple font-bold flex items-center gap-1 shrink-0">
        Trocar <ChevronRight className="size-3" />
      </div>
    </Link>
  );
}

/** Placeholder quando nenhuma festa está selecionada. */
export function NoFestaSelected() {
  return (
    <div className="glass rounded-2xl p-8 text-center">
      <p className="text-sm font-semibold mb-2">Selecione uma festa</p>
      <p className="text-xs text-muted-foreground mb-4">
        Você precisa escolher uma festa para visualizar passageiros, ônibus e check-in.
      </p>
      <Link
        to="/staff"
        className="inline-flex h-10 px-4 rounded-xl bg-gradient-to-r from-neon-green to-neon-purple text-primary-foreground font-bold text-sm items-center justify-center"
      >
        Ir para minhas festas
      </Link>
    </div>
  );
}
