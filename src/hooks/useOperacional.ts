import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

// B-14.3: Operacional = painel de entregas pendentes.
// Pagamentos têm fluxo próprio (financeiro) e NÃO entram aqui.
// Confirmar pagamento não resolve a pendência de entrega — somente o envio do item.
export type OperacionalGroupKey =
  | "convites"
  | "sem_poltrona"
  | "sem_embarque"
  | "combos"
  | "ingressos"
  | "camping"
  | "outros";

export type OperacionalItem = {
  id: string;
  titulo: string;
  subtitulo: string | null;
  to?: string;
  token?: string;
  papel?: string;
};

export type OperacionalGroup = {
  key: OperacionalGroupKey;
  label: string;
  count: number;
  items: OperacionalItem[];
};

const ITEM_GROUP_BY_TIPO: Record<string, { key: OperacionalGroupKey; label: string }> = {
  combo: { key: "combos", label: "combos aguardando envio" },
  ingresso: { key: "ingressos", label: "ingressos aguardando envio" },
  camping: { key: "camping", label: "camping aguardando envio" },
  solidario: { key: "outros", label: "itens aguardando envio" },
};

const OUTROS_GROUP = { key: "outros" as const, label: "itens aguardando envio" };

async function fetchOperacional(userId: string): Promise<OperacionalGroup[]> {
  // Usa a mesma RPC do painel /app — inclui excursões onde o usuário é
  // organizador raiz, sócio (excursionista_socios) ou coorganizador
  // (equipe_excursoes). Filtrar apenas por organizer_id deixava sócios
  // com Operacional vazio mesmo havendo pedidos pendentes.
  const { data: rpcRows } = await (supabase as any).rpc("list_managed_excursoes");
  const exList: { id: string; titulo: string }[] = (rpcRows ?? []).map((r: any) => ({
    id: r.id as string,
    titulo: (r.titulo as string) ?? "",
  }));
  const excIds = exList.map((e) => e.id);
  const exTitle = new Map<string, string>(exList.map((e) => [e.id, e.titulo]));

  const empty = (key: OperacionalGroupKey, label: string): OperacionalGroup => ({
    key,
    label,
    count: 0,
    items: [],
  });

  if (excIds.length === 0) {
    return [
      empty("convites", "convites pendentes"),
      empty("sem_poltrona", "passageiros sem poltrona"),
      empty("sem_embarque", "passageiros sem embarque"),
      empty("combos", "combos aguardando envio"),
      empty("ingressos", "ingressos aguardando envio"),
      empty("camping", "camping aguardando envio"),
    ];
  }

  const nowIso = new Date().toISOString();

  const [convitesRes, semPoltronaRes, semEmbarqueRes, pedidosRes] = await Promise.all([
    supabase
      .from("invitations")
      .select("id, token, papel, excursao_id, created_at")
      .eq("created_by", userId)
      .eq("used", false)
      .gt("expires_at", nowIso)
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
      .select(
        "id, excursao_id, passageiro_id, comprador_id, status, item:excursao_itens(nome, tipo), pax:passageiros(nome, payment_status)",
      )
      .in("excursao_id", excIds)
      .eq("status", "pendente")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  // B-14.8: pedidos_itens entram no Operacional independentemente do status
  // de pagamento. O pedido em si é a entrega pendente — só sai quando
  // `status='enviado'`. Isso vale para combos (com passageiro), ingressos
  // avulsos, camping e copos (sem passageiro/reserva vinculados).
  const compradorIdsMissingPax = Array.from(
    new Set(
      (pedidosRes.data ?? [])
        .filter((p: any) => !p.pax?.nome && p.comprador_id)
        .map((p: any) => p.comprador_id as string),
    ),
  );
  const compradorNome = new Map<string, string>();
  if (compradorIdsMissingPax.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", compradorIdsMissingPax);
    for (const pr of profs ?? []) {
      if ((pr as any).full_name) compradorNome.set((pr as any).id, (pr as any).full_name);
    }
  }


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

  // Agrupar pedidos por tipo de item (combo / ingresso / camping / outros).
  // Regra B-14.3: pendência só desaparece quando status='enviado'.
  const bucket: Record<OperacionalGroupKey, OperacionalItem[]> = {
    convites: [],
    sem_poltrona: [],
    sem_embarque: [],
    combos: [],
    ingressos: [],
    camping: [],
    outros: [],
  };

  for (const p of pedidosRes.data ?? []) {
    const pax = (p as any).pax;
    const compradorId = (p as any).comprador_id as string | null;
    const excursaoId = (p as any).excursao_id as string;
    // B-14.8: sem gate de pagamento — o pedido em si é a entrega pendente.
    // Só some quando status='enviado' (filtrado na query).

    const tipo = (p as any).item?.tipo ?? "";
    const target = ITEM_GROUP_BY_TIPO[tipo]?.key ?? OUTROS_GROUP.key;
    const paxNome = pax?.nome ?? (compradorId ? compradorNome.get(compradorId) : null) ?? "Comprador";
    const festa = exTitle.get(excursaoId) ?? null;
    bucket[target].push({
      id: (p as any).id,
      titulo: paxNome,
      subtitulo: [festa, (p as any).item?.nome].filter(Boolean).join(" — ") || null,
      to: `/app/excursao/${excursaoId}/itens?focus=${(p as any).id}`,
    });
  }


  return [
    { key: "convites", label: "convites pendentes", count: convites.length, items: convites },
    { key: "sem_poltrona", label: "passageiros sem poltrona", count: sem_poltrona.length, items: sem_poltrona },
    { key: "sem_embarque", label: "passageiros sem embarque", count: sem_embarque.length, items: sem_embarque },
    { key: "combos", label: "combos aguardando envio", count: bucket.combos.length, items: bucket.combos },
    { key: "ingressos", label: "ingressos aguardando envio", count: bucket.ingressos.length, items: bucket.ingressos },
    { key: "camping", label: "camping aguardando envio", count: bucket.camping.length, items: bucket.camping },
    { key: "outros", label: OUTROS_GROUP.label, count: bucket.outros.length, items: bucket.outros },
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
