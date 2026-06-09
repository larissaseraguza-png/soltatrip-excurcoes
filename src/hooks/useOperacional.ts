import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

export type OperacionalGroupKey =
  | "convites"
  | "recebimentos"
  | "sem_poltrona"
  | "sem_embarque"
  | "combos";

export type OperacionalItem = {
  id: string;
  // Texto principal (ex: nome do passageiro, "Convite — staff")
  titulo: string;
  // Texto secundário (ex: nome da excursão)
  subtitulo: string | null;
  // Onde abrir para resolver. Para convites pode ser null (ação é copy-link).
  to?: string;
  // Token de convite quando aplicável (categoria convites).
  token?: string;
  papel?: string;
};

export type OperacionalGroup = {
  key: OperacionalGroupKey;
  label: string;
  count: number;
  items: OperacionalItem[];
};

async function fetchOperacional(userId: string): Promise<OperacionalGroup[]> {
  const { data: excursoes } = await supabase
    .from("excursoes")
    .select("id,titulo")
    .eq("organizer_id", userId);
  const exList = excursoes ?? [];
  const excIds = exList.map((e) => e.id);
  const exTitle = new Map(exList.map((e) => [e.id, e.titulo as string]));

  const empty = (key: OperacionalGroupKey, label: string): OperacionalGroup => ({
    key,
    label,
    count: 0,
    items: [],
  });

  if (excIds.length === 0) {
    return [
      empty("convites", "convites pendentes"),
      empty("recebimentos", "recebimentos pendentes"),
      empty("sem_poltrona", "passageiros sem poltrona"),
      empty("sem_embarque", "passageiros sem embarque"),
      empty("combos", "combos aguardando envio"),
    ];
  }

  const nowIso = new Date().toISOString();

  const [convitesRes, recebimentosRes, semPoltronaRes, semEmbarqueRes, combosRes] = await Promise.all([
    supabase
      .from("invitations")
      .select("id, token, papel, excursao_id, created_at")
      .eq("created_by", userId)
      .eq("used", false)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("pagamentos")
      .select("id, valor, passageiro_id, excursao_id, pax:passageiros(nome)")
      .in("excursao_id", excIds)
      .eq("status", "pendente")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("passageiros")
      .select("id, nome, excursao_id")
      .in("excursao_id", excIds)
      .eq("payment_status", "paid")
      .is("seat_id", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("passageiros")
      .select("id, nome, excursao_id")
      .in("excursao_id", excIds)
      .eq("payment_status", "paid")
      .is("ponto_embarque_id", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("pedidos_itens")
      .select("id, excursao_id, passageiro_id, item:excursao_itens(nome), pax:passageiros(nome)")
      .in("excursao_id", excIds)
      .eq("status", "pendente")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const convites: OperacionalItem[] = (convitesRes.data ?? []).map((c: any) => {
    const exTit = c.excursao_id ? exTitle.get(c.excursao_id) ?? null : null;
    const papelLabel =
      c.papel === "socio_raiz"
        ? "Convite de sócio"
        : c.papel === "coorganizador"
          ? "Convite de coorganizador"
          : c.papel === "staff"
            ? "Convite de staff"
            : `Convite (${c.papel})`;
    return {
      id: c.id,
      titulo: papelLabel,
      subtitulo: exTit,
      token: c.token,
      papel: c.papel,
    };
  });

  const sem_poltrona: OperacionalItem[] = (semPoltronaRes.data ?? []).map((p: any) => ({
    id: p.id,
    titulo: p.nome,
    subtitulo: exTitle.get(p.excursao_id) ?? null,
    to: `/app/excursao/${p.excursao_id}/passageiros?focus=${p.id}&action=seat`,
  }));

  const sem_embarque: OperacionalItem[] = (semEmbarqueRes.data ?? []).map((p: any) => ({
    id: p.id,
    titulo: p.nome,
    subtitulo: exTitle.get(p.excursao_id) ?? null,
    to: `/app/excursao/${p.excursao_id}/passageiros?focus=${p.id}&action=ponto`,
  }));

  const combos: OperacionalItem[] = (combosRes.data ?? []).map((p: any) => ({
    id: p.id,
    titulo: p.item?.nome ?? "Combo",
    subtitulo: [p.pax?.nome, exTitle.get(p.excursao_id)].filter(Boolean).join(" — ") || null,
    to: `/app/excursao/${p.excursao_id}/itens`,
  }));

  const recebimentos: OperacionalItem[] = (recebimentosRes.data ?? []).map((p: any) => ({
    id: p.id,
    titulo: p.pax?.nome ?? "Pagamento pendente",
    subtitulo: [
      `R$ ${Number(p.valor ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      exTitle.get(p.excursao_id),
    ]
      .filter(Boolean)
      .join(" — ") || null,
    to: `/app/excursao/${p.excursao_id}/financeiro?focus=${p.passageiro_id ?? p.id}`,
  }));

  return [
    { key: "convites", label: "convites pendentes", count: convites.length, items: convites },
    { key: "recebimentos", label: "recebimentos pendentes", count: recebimentos.length, items: recebimentos },
    { key: "sem_poltrona", label: "passageiros sem poltrona", count: sem_poltrona.length, items: sem_poltrona },
    { key: "sem_embarque", label: "passageiros sem embarque", count: sem_embarque.length, items: sem_embarque },
    { key: "combos", label: "combos aguardando envio", count: combos.length, items: combos },
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
          { table: "pagamentos" },
        ]
      : [],
    [["operacional", uid]],
  );

  const groups = query.data ?? [];
  const pendingCategories = groups.filter((g) => g.count > 0).length;

  return { groups, pendingCategories, isLoading: query.isLoading };
}
