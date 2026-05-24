import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Filter = { table: string; filter?: string };
type RealtimePayload = {
  eventType: string;
  table: string;
  schema: string;
  new: Record<string, any>;
  old: Record<string, any>;
};

/**
 * Inscreve em mudanças realtime do Supabase e invalida queries do React Query.
 *
 * Estabilizado com refs para evitar re-subscrições em loop quando o componente
 * re-renderiza (causa principal de "loading infinito" / lentidão geral).
 * Apenas o nome do canal e a assinatura dos filtros disparam reconexão.
 *
 * Além disso, debouncing curto agrupa rajadas de eventos em uma única
 * invalidação para reduzir consultas repetidas no banco.
 */
export function useRealtimeSync(
  channelName: string,
  filters: Filter[],
  invalidateKeys: any[][],
  onEvent?: (payload: RealtimePayload) => void,
) {
  const qc = useQueryClient();
  const keysRef = useRef(invalidateKeys);
  const onEventRef = useRef(onEvent);

  // Mantém refs atualizadas sem disparar resubscribe
  keysRef.current = invalidateKeys;
  onEventRef.current = onEvent;

  // Chave estável dos filtros — só muda quando o conteúdo realmente muda
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    if (!filters.length) return;
    const channel = supabase.channel(channelName);
    let scheduled: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      scheduled = null;
      const keys = keysRef.current;
      for (const k of keys) qc.invalidateQueries({ queryKey: k });
    };

    filters.forEach((f) => {
      channel.on(
        // @ts-ignore postgres_changes é um evento válido em runtime
        "postgres_changes",
        { event: "*", schema: "public", table: f.table, ...(f.filter ? { filter: f.filter } : {}) },
        (payload) => {
          if (!scheduled) scheduled = setTimeout(flush, 150);
          onEventRef.current?.(payload as RealtimePayload);
        },
      );
    });

    channel.subscribe();
    return () => {
      if (scheduled) clearTimeout(scheduled);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, filtersKey]);
}
