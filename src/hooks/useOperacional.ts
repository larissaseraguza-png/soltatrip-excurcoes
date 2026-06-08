import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

export type OperacionalGroupKey =
  | "convites"
  | "sem_poltrona"
  | "sem_embarque"
  | "combos";

export type OperacionalGroup = {
  key: OperacionalGroupKey;
  label: string;
  count: number;
  to: string;
};

async function fetchOperacional(userId: string): Promise<OperacionalGroup[]> {
  // IDs das excursões do organizador (RLS já restringe — usamos para escopar
  // queries em outras tabelas).
  const { data: excursoes } = await supabase
    .from("excursoes")
    .select("id")
    .eq("organizer_id", userId);
  const excIds = (excursoes ?? []).map((e) => e.id);

  if (excIds.length === 0) {
    return [
      { key: "convites", label: "convites pendentes", count: 0, to: "/app/pendentes" },
      { key: "sem_poltrona", label: "passageiros sem poltrona", count: 0, to: "/app/passageiros" },
      { key: "sem_embarque", label: "passageiros sem embarque", count: 0, to: "/app/passageiros" },
      { key: "combos", label: "combos aguardando envio", count: 0, to: "/app/passageiros" },
    ];
  }

  const nowIso = new Date().toISOString();

  const [convitesRes, semPoltronaRes, semEmbarqueRes, combosRes] = await Promise.all([
    supabase
      .from("invitations")
      .select("id", { count: "exact", head: true })
      .eq("created_by", userId)
      .eq("used", false)
      .gt("expires_at", nowIso),
    supabase
      .from("passageiros")
      .select("id", { count: "exact", head: true })
      .in("excursao_id", excIds)
      .eq("payment_status", "paid")
      .is("seat_id", null),
    supabase
      .from("passageiros")
      .select("id", { count: "exact", head: true })
      .in("excursao_id", excIds)
      .eq("payment_status", "paid")
      .is("ponto_embarque_id", null),
    supabase
      .from("pedidos_itens")
      .select("id", { count: "exact", head: true })
      .in("excursao_id", excIds)
      .eq("status", "pendente"),
  ]);

  return [
    {
      key: "convites",
      label: "convites pendentes",
      count: convitesRes.count ?? 0,
      to: "/app/pendentes",
    },
    {
      key: "sem_poltrona",
      label: "passageiros sem poltrona",
      count: semPoltronaRes.count ?? 0,
      to: "/app/passageiros",
    },
    {
      key: "sem_embarque",
      label: "passageiros sem embarque",
      count: semEmbarqueRes.count ?? 0,
      to: "/app/passageiros",
    },
    {
      key: "combos",
      label: "combos aguardando envio",
      count: combosRes.count ?? 0,
      to: "/app/passageiros",
    },
  ];
}

export function useOperacional() {
  const { user } = useAuth();
  const uid = user?.id ?? null;

  const query = useQuery({
    queryKey: ["operacional", uid],
    queryFn: () => fetchOperacional(uid!),
    enabled: !!uid,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  useRealtimeSync(
    `operacional:${uid ?? "anon"}`,
    uid
      ? [
          { table: "passageiros" },
          { table: "invitations", filter: `created_by=eq.${uid}` },
          { table: "pedidos_itens" },
        ]
      : [],
    [["operacional", uid]],
  );

  const groups = query.data ?? [];
  const pendingCategories = groups.filter((g) => g.count > 0).length;

  return { groups, pendingCategories, isLoading: query.isLoading };
}
