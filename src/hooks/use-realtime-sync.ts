import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Filter = { table: string; filter?: string };

/**
 * Inscreve em mudanças realtime do Supabase e invalida queries do React Query
 * para propagar alterações automaticamente entre painéis (excursionista → staff → passageiro).
 */
export function useRealtimeSync(channelName: string, filters: Filter[], invalidateKeys: any[][]) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!filters.length) return;
    const channel = supabase.channel(channelName);

    filters.forEach((f) => {
      channel.on(
        // @ts-ignore postgres_changes is valid runtime event
        "postgres_changes",
        { event: "*", schema: "public", table: f.table, ...(f.filter ? { filter: f.filter } : {}) },
        () => {
          invalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
        },
      );
    });

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, JSON.stringify(filters), JSON.stringify(invalidateKeys)]);
}
