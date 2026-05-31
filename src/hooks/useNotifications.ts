import { useMemo } from "react";
import type { NotifRole } from "@/lib/notifications/store";
import { useNotificationsV2 } from "@/lib/notifications/v2";

/**
 * F2 consolidado: a Central de Notificações é 100% event-driven.
 * Eventos de negócio são emitidos por triggers de banco (pagamentos/reservas)
 * ou pela RPC `emit_business_event` (demais fluxos). Não há mais leitura/
 * gravação em localStorage para notificações de negócio.
 */
export function useNotifications(role: NotifRole) {
  const v2 = useNotificationsV2(role);

  const items = useMemo(
    () => [...v2.items].sort((a, b) => b.createdAt - a.createdAt),
    [v2.items],
  );

  const unread = useMemo(
    () => v2.items.reduce((n, item) => (item.read ? n : n + 1), 0),
    [v2.items],
  );

  return {
    items,
    unread,
    markAllRead: v2.markAllRead,
    clearAll: v2.dismissAllVisible,
  };
}
