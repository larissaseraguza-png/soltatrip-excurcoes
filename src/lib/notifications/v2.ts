// Camada V2 da Central de Notificações.
// Lê da tabela public.notifications (Supabase) e mapeia para o formato
// consumido pelo painel/bell (compatível com src/lib/notifications/store.ts).
//
// F1: dual facade — coexiste com o store local (localStorage).
// Sem Realtime ainda; apenas polling leve via React Query.

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
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
};

function mapRow(row: DbRow): V2Item | null {
  const role = TYPE_ROLE[row.type];
  if (!role) return null;
  return {
    id: `v2:${row.id}`,
    __source: "v2",
    __dbId: row.id,
    __readAtDb: row.read_at,
    role,
    icon: TYPE_ICON[row.type] ?? "calendar",
    tone: TYPE_TONE[row.type] ?? "blue",
    title: row.title,
    message: row.message ?? "",
    createdAt: new Date(row.created_at).getTime(),
    read: !!row.read_at,
    link: row.link ?? undefined,
    category: CATEGORY_MAP[row.category],
    excursao: undefined,
  };
}

async function fetchV2(): Promise<V2Item[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("id,type,category,title,message,link,data,created_at,read_at,excursao_id")
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.warn("[notifications/v2] fetch error:", error.message);
    return [];
  }
  return (data ?? [])
    .map((r) => mapRow(r as unknown as DbRow))
    .filter((x): x is V2Item => x !== null);
}

export function useNotificationsV2(role: NotifRole) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications-v2"],
    queryFn: fetchV2,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const items = useMemo(
    () => (data ?? []).filter((n) => n.role === role),
    [data, role],
  );

  const markAllRead = useCallback(async () => {
    try {
      await supabase.rpc("notification_mark_all_read");
    } catch (e) {
      console.warn("[notifications/v2] markAllRead failed:", e);
    }
    await queryClient.invalidateQueries({ queryKey: ["notifications-v2"] });
  }, [queryClient]);

  const dismissAllVisible = useCallback(async () => {
    const ids = items.map((i) => i.__dbId);
    if (ids.length === 0) return;
    try {
      await Promise.allSettled(
        ids.map((id) => supabase.rpc("notification_dismiss", { _id: id })),
      );
    } catch (e) {
      console.warn("[notifications/v2] dismissAll failed:", e);
    }
    await queryClient.invalidateQueries({ queryKey: ["notifications-v2"] });
  }, [items, queryClient]);

  return { items, markAllRead, dismissAllVisible };
}

// SUPPRESSED_LOCAL_EMITS removido na consolidação F2: não há mais emissão
// local concorrente para suprimir — todo evento de negócio passa por trigger
// de banco ou pela RPC `emit_business_event`.

