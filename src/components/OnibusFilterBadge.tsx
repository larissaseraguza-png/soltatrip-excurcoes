import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Mostra uma faixa "filtrado por Ônibus X" no topo de uma tela
 * do excursionista quando há `?onibus=<id>` na URL. Inclui botão para
 * remover o filtro voltando para a versão consolidada da excursão.
 */
export function OnibusFilterBadge({
  excursaoId,
  onibusId,
}: {
  excursaoId: string;
  onibusId: string | null | undefined;
}) {
  const { data: onibus } = useQuery({
    queryKey: ["onibus-badge", onibusId],
    enabled: !!onibusId,
    queryFn: async () => {
      const { data } = await supabase
        .from("onibus")
        .select("id, nome, horario_saida")
        .eq("id", onibusId!)
        .maybeSingle();
      return data;
    },
  });

  if (!onibusId) return null;

  return (
    <div className="glass rounded-2xl p-3 mb-4 flex items-center gap-3 border border-neon-pink/40 bg-neon-pink/5">
      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center shrink-0">
        <Bus className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Filtrado por ônibus</p>
        <p className="text-sm font-semibold truncate">
          {onibus?.nome ?? "Carregando..."}
          {onibus?.horario_saida && <span className="text-xs text-muted-foreground"> · {onibus.horario_saida}</span>}
        </p>
      </div>
      <Link
        to="/app/excursao/$id/onibus/$onibusId"
        params={{ id: excursaoId, onibusId }}
        className="text-[11px] font-bold text-neon-pink hover:underline shrink-0"
      >
        Painel
      </Link>
      <Link
        to="."
        search={{}}
        className="h-8 w-8 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center shrink-0"
        title="Remover filtro"
      >
        <X className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
