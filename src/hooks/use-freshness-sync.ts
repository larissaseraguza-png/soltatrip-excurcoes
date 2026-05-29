import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Sincronização leve baseada em `updated_at` (sem realtime/websocket).
 *
 * Estratégia:
 * - Ao montar a tela e ao retornar foco/visibilidade, faz UMA query leve
 *   (`SELECT max(updated_at)`) em tabelas-alvo filtradas por excursão.
 * - Se o timestamp mudou desde o último check, invalida as queryKeys
 *   relacionadas (forçando refetch). Caso contrário, nada acontece.
 *
 * Custo: 1 request curto por foco/mount — muito mais barato que polling
 * periódico ou websocket.
 */

// Cache global do último timestamp visto por escopo (sobrevive a navegações).
const lastSeen = new Map<string, string>();

type TableScope = { table: "reservas" | "pagamentos" | "passageiros" | "checkins" | "seats"; col?: string };

async function fetchMaxTimestamp(excursaoId: string, tables: TableScope[]): Promise<string | null> {
  const results = await Promise.all(
    tables.map(async (t) => {
      const col = t.col ?? (t.table === "checkins" ? "created_at" : "updated_at");
      const { data } = await supabase
        .from(t.table)
        .select(`${col}`)
        .eq("excursao_id", excursaoId)
        .order(col, { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as any)?.[col] as string | undefined;
    }),
  );
  const valid = results.filter(Boolean) as string[];
  if (!valid.length) return null;
  return valid.sort().at(-1)!;
}

export function useFreshnessSync(
  scopeKey: string | null | undefined,
  tables: TableScope[],
  invalidateKeys: any[][],
) {
  const qc = useQueryClient();
  const keysRef = useRef(invalidateKeys);
  const tablesRef = useRef(tables);
  keysRef.current = invalidateKeys;
  tablesRef.current = tables;

  useEffect(() => {
    if (!scopeKey) return;
    let cancelled = false;
    const excursaoId = scopeKey.startsWith("excursao:") ? scopeKey.slice(9) : scopeKey;

    const check = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const ts = await fetchMaxTimestamp(excursaoId, tablesRef.current);
        if (cancelled || !ts) return;
        const prev = lastSeen.get(scopeKey);
        if (prev !== ts) {
          lastSeen.set(scopeKey, ts);
          if (prev !== undefined) {
            // Só invalida se já tínhamos baseline anterior (evita refetch duplicado no mount inicial).
            for (const k of keysRef.current) qc.invalidateQueries({ queryKey: k });
          }
        }
      } catch {
        /* silencioso */
      }
    };

    // Check inicial (estabelece baseline) e a cada foco/visibility.
    check();
    const onVis = () => { if (document.visibilityState === "visible") check(); };
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [scopeKey, qc]);
}

/**
 * Força o próximo check a invalidar (útil após executar uma ação crítica
 * — pagamento, check-in, alteração de embarque — para garantir refetch no
 * retorno à tela).
 */
export function bumpFreshness(scopeKey: string) {
  lastSeen.delete(scopeKey);
}
