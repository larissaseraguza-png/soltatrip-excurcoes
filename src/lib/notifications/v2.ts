// Camada V2 da Central de Notificações.
// Lê da tabela public.notifications (Supabase) e mapeia para o formato
// consumido pelo painel/bell (compatível com src/lib/notifications/store.ts).
//
// F1: dual facade — coexiste com o store local (localStorage).
// Sem Realtime ainda; apenas polling leve via React Query.

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  Notification as LocalNotif,
  NotifCategory,
  NotifIconKey,
  NotifRole,
  NotifTone,
} from "./store";

type DbNotifType =
  | "payment.submitted"
  | "payment.approved"
  | "payment.rejected"
  | "payment.manual_recorded"
  | "booking.created"
  | "booking.paid"
  | "booking.cancelled"
  | "checkin.done"
  | "checkin.undone"
  | "boarding.done"
  | "boarding.undone"
  | "invitation.created"
  | "invitation.accepted"
  | "invitation.expired"
  | "team.added"
  | "team.removed"
  | "socio.invited"
  | "socio.accepted"
  | "item.ordered"
  | "item.delivered"
  | "item.received_confirmed"
  | "excursion.published"
  | "excursion.updated"
  | "excursion.cancelled"
  | "system.info"
  | "system.warning";

type DbRow = {
  id: string;
  type: DbNotifType;
  category: string;
  title: string;
  message: string | null;
  link: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
  excursao_id: string | null;
  reserva_id: string | null;
  passageiro_id: string | null;
  pagamento_id: string | null;
};

const TYPE_ROLE: Record<DbNotifType, NotifRole> = {
  "payment.submitted": "excursionista",
  "payment.approved": "passageiro",
  "payment.rejected": "passageiro",
  "payment.manual_recorded": "passageiro",
  "booking.created": "excursionista",
  "booking.paid": "passageiro",
  "booking.cancelled": "excursionista",
  "checkin.done": "staff",
  "checkin.undone": "staff",
  "boarding.done": "staff",
  "boarding.undone": "staff",
  "invitation.created": "excursionista",
  "invitation.accepted": "excursionista",
  "invitation.expired": "excursionista",
  "team.added": "excursionista",
  "team.removed": "excursionista",
  "socio.invited": "excursionista",
  "socio.accepted": "excursionista",
  "item.ordered": "excursionista",
  "item.delivered": "passageiro",
  "item.received_confirmed": "excursionista",
  "excursion.published": "passageiro",
  "excursion.updated": "passageiro",
  "excursion.cancelled": "passageiro",
  "system.info": "excursionista",
  "system.warning": "excursionista",
};

const TYPE_ICON: Record<DbNotifType, NotifIconKey> = {
  "payment.submitted": "clock",
  "payment.approved": "credit-card",
  "payment.rejected": "credit-card",
  "payment.manual_recorded": "credit-card",
  "booking.created": "ticket",
  "booking.paid": "credit-card",
  "booking.cancelled": "ticket",
  "checkin.done": "check-circle",
  "checkin.undone": "log-out",
  "boarding.done": "check-circle",
  "boarding.undone": "log-out",
  "invitation.created": "user-plus",
  "invitation.accepted": "user-plus",
  "invitation.expired": "clock",
  "team.added": "shield",
  "team.removed": "shield",
  "socio.invited": "users",
  "socio.accepted": "users",
  "item.ordered": "ticket",
  "item.delivered": "ticket",
  "item.received_confirmed": "check-circle",
  "excursion.published": "calendar",
  "excursion.updated": "calendar",
  "excursion.cancelled": "calendar",
  "system.info": "calendar",
  "system.warning": "clock",
};

const TYPE_TONE: Record<DbNotifType, NotifTone> = {
  "payment.submitted": "amber",
  "payment.approved": "green",
  "payment.rejected": "pink",
  "payment.manual_recorded": "green",
  "booking.created": "purple",
  "booking.paid": "green",
  "booking.cancelled": "pink",
  "checkin.done": "green",
  "checkin.undone": "pink",
  "boarding.done": "green",
  "boarding.undone": "pink",
  "invitation.created": "purple",
  "invitation.accepted": "green",
  "invitation.expired": "amber",
  "team.added": "purple",
  "team.removed": "pink",
  "socio.invited": "purple",
  "socio.accepted": "green",
  "item.ordered": "purple",
  "item.delivered": "blue",
  "item.received_confirmed": "green",
  "excursion.published": "purple",
  "excursion.updated": "blue",
  "excursion.cancelled": "pink",
  "system.info": "blue",
  "system.warning": "amber",
};

const CATEGORY_MAP: Record<string, NotifCategory> = {
  payment: "pagamentos",
  booking: "reservas",
  checkin: "checkin",
  boarding: "embarque",
  invitation: "staff",
  team: "staff",
  item: "reservas",
  excursion: "alteracoes",
  system: "alteracoes",
};

export type V2Item = LocalNotif & {
  __source: "v2";
  __dbId: string;
  __readAtDb: string | null;
  __type: string;
  __data: Record<string, unknown> | null;
  __excursaoId: string | null;
};

function mapRow(row: DbRow): V2Item | null {
  const role = TYPE_ROLE[row.type];
  if (!role) return null;
  // Mescla colunas de escopo (passageiro/reserva/pagamento) no `data` para
  // que resolveNotificationRoute consiga montar URLs específicas (focus).
  const baseData = (row.data as Record<string, unknown> | null) ?? null;
  const mergedData: Record<string, unknown> = { ...(baseData ?? {}) };
  if (row.passageiro_id && mergedData.passageiro_id == null)
    mergedData.passageiro_id = row.passageiro_id;
  if (row.reserva_id && mergedData.reserva_id == null)
    mergedData.reserva_id = row.reserva_id;
  if (row.pagamento_id && mergedData.pagamento_id == null)
    mergedData.pagamento_id = row.pagamento_id;
  return {
    id: `v2:${row.id}`,
    __source: "v2",
    __dbId: row.id,
    __readAtDb: row.read_at,
    __type: row.type,
    __data: mergedData,
    __excursaoId: row.excursao_id ?? null,
    role,
    icon: TYPE_ICON[row.type] ?? "calendar",
    tone: TYPE_TONE[row.type] ?? "blue",
    title: row.title,
    message: row.message ?? "",
    createdAt: new Date(row.created_at).getTime(),
    read: !!row.read_at,
    // F4 prep: rota resolvida dinamicamente pelo consumidor a partir de __type + __data.
    // `link` legado do banco é ignorado para evitar rotas inválidas/"not found".
    link: undefined,
    category: CATEGORY_MAP[row.category],
    excursao: undefined,
  };
}

async function fetchV2(): Promise<V2Item[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  // Histórico permanente: trazemos lidas e não-lidas. Apenas dismissed
  // (limpar histórico) são excluídas. RLS por recipient_id garante isolamento.
  const { data, error } = await supabase
    .from("notifications")
    .select("id,type,category,title,message,link,data,created_at,read_at,excursao_id")
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.warn("[notifications/v2] fetch error:", error.message);
    return [];
  }
  return (data ?? [])
    .map((r) => mapRow(r as unknown as DbRow))
    .filter((x): x is V2Item => x !== null);
}

const QK = ["notifications-v2"] as const;

export function useNotificationsV2(role: NotifRole) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: QK,
    queryFn: fetchV2,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // F3: Realtime — escuta INSERT/UPDATE/DELETE escopados pelo recipient_id
  // (RLS já garante isolamento; o filter reduz tráfego). Em caso de erro/
  // desconexão, fazemos refetch de fallback ao reconectar.
  const refetched = useRef(false);
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let backoff: ReturnType<typeof setTimeout> | null = null;

    const setup = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (cancelled || !auth.user) return;
      const uid = auth.user.id;

      const applyInsert = (row: DbRow) => {
        const item = mapRow(row);
        if (!item) return;
        queryClient.setQueryData<V2Item[]>(QK, (prev) => {
          const list = prev ?? [];
          if (list.some((n) => n.__dbId === item.__dbId)) return list;
          return [item, ...list].slice(0, 100);
        });
      };

      const applyUpdate = (row: DbRow) => {
        // dismissed → remove; senão atualiza read_at/título/etc.
        queryClient.setQueryData<V2Item[]>(QK, (prev) => {
          const list = prev ?? [];
          // @ts-expect-error dismissed_at não está no DbRow tipado mas vem no payload
          if (row.dismissed_at) return list.filter((n) => n.__dbId !== row.id);
          const mapped = mapRow(row);
          if (!mapped) return list;
          const idx = list.findIndex((n) => n.__dbId === row.id);
          if (idx === -1) return [mapped, ...list].slice(0, 100);
          const next = list.slice();
          next[idx] = mapped;
          return next;
        });
      };

      const applyDelete = (row: { id: string }) => {
        queryClient.setQueryData<V2Item[]>(QK, (prev) =>
          (prev ?? []).filter((n) => n.__dbId !== row.id),
        );
      };

      // Nome único por mount para evitar reuso do mesmo channel entre
      // StrictMode/duplas montagens (erro "cannot add postgres_changes ... after subscribe()").
      const channelName = `notifications:${uid}:${Math.random().toString(36).slice(2, 10)}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${uid}` },
          (payload) => applyInsert(payload.new as DbRow),
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `recipient_id=eq.${uid}` },
          (payload) => applyUpdate(payload.new as DbRow),
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "notifications", filter: `recipient_id=eq.${uid}` },
          (payload) => applyDelete(payload.old as { id: string }),
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            // ao (re)conectar, refetch uma vez para fechar gap
            if (refetched.current) {
              queryClient.invalidateQueries({ queryKey: QK });
            }
            refetched.current = true;
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            // backoff: tenta refetch como fallback
            if (backoff) clearTimeout(backoff);
            backoff = setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: QK });
            }, 3_000);
          }
        });
    };

    setup();
    return () => {
      cancelled = true;
      if (backoff) clearTimeout(backoff);
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const items = useMemo(
    () =>
      (data ?? []).filter((n) => {
        if (n.role !== role) return false;
        // B-14.1: separação definitiva — Notificações = acontecimentos
        // (clicáveis, sempre com nome da pessoa), Operacional = tarefas
        // pendentes (entregas / ações futuras).
        //
        // payment.submitted volta para Notificações (ex.: "Maria enviou
        // pagamento") e CONTINUA aparecendo em Operacional como
        // "recebimentos pendentes" — são sistemas independentes com
        // contadores próprios.
        //
        // Os tipos abaixo permanecem APENAS no Operacional pois representam
        // a própria ação do excursionista (não geram acontecimento):
        //   - invitation.created / socio.invited → "convites pendentes"
        //   - item.ordered                       → "combos aguardando envio"
        if (role === "excursionista") {
          if (
            n.__type === "invitation.created" ||
            n.__type === "socio.invited" ||
            n.__type === "item.ordered"
          ) {
            return false;
          }
        }
        return true;
      }),
    [data, role],
  );

  const markAllRead = useCallback(async () => {
    // Otimista: marca todas como lidas no cache imediatamente
    const now = new Date().toISOString();
    queryClient.setQueryData<V2Item[]>(QK, (prev) =>
      (prev ?? []).map((n) => (n.read ? n : { ...n, read: true, __readAtDb: now })),
    );
    try {
      await supabase.rpc("notification_mark_all_read");
    } catch (e) {
      console.warn("[notifications/v2] markAllRead failed:", e);
      queryClient.invalidateQueries({ queryKey: QK });
    }
  }, [queryClient]);

  const markRead = useCallback(
    async (dbId: string) => {
      const now = new Date().toISOString();
      queryClient.setQueryData<V2Item[]>(QK, (prev) =>
        (prev ?? []).map((n) =>
          n.__dbId === dbId && !n.read ? { ...n, read: true, __readAtDb: now } : n,
        ),
      );
      try {
        await supabase.rpc("notification_mark_read", { _id: dbId });
      } catch (e) {
        console.warn("[notifications/v2] markRead failed:", e);
        queryClient.invalidateQueries({ queryKey: QK });
      }
    },
    [queryClient],
  );

  const dismiss = useCallback(
    async (dbId: string) => {
      queryClient.setQueryData<V2Item[]>(QK, (prev) =>
        (prev ?? []).filter((n) => n.__dbId !== dbId),
      );
      try {
        await supabase.rpc("notification_dismiss", { _id: dbId });
      } catch (e) {
        console.warn("[notifications/v2] dismiss failed:", e);
        queryClient.invalidateQueries({ queryKey: QK });
      }
    },
    [queryClient],
  );

  const dismissAllVisible = useCallback(async () => {
    const ids = items.map((i) => i.__dbId);
    if (ids.length === 0) return;
    // Otimista: remove do cache
    const idSet = new Set(ids);
    queryClient.setQueryData<V2Item[]>(QK, (prev) =>
      (prev ?? []).filter((n) => !idSet.has(n.__dbId)),
    );
    try {
      await Promise.allSettled(
        ids.map((id) => supabase.rpc("notification_dismiss", { _id: id })),
      );
    } catch (e) {
      console.warn("[notifications/v2] dismissAll failed:", e);
      queryClient.invalidateQueries({ queryKey: QK });
    }
  }, [items, queryClient]);

  return { items, markAllRead, dismissAllVisible, markRead, dismiss };
}


