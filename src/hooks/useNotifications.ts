import { useSyncExternalStore, useCallback, useMemo } from "react";
import {
  subscribe,
  getSnapshot,
  getUnreadCount,
  markAllRead as localMarkAllRead,
  clearAll as localClearAll,
  type NotifRole,
  type Notification,
} from "@/lib/notifications/store";
import { useNotificationsV2 } from "@/lib/notifications/v2";

const emptyServer: ReturnType<typeof getSnapshot> = [];

export function useNotifications(role: NotifRole) {
  const sub = useCallback((l: () => void) => subscribe(role, l), [role]);
  const localItems = useSyncExternalStore(
    sub,
    () => getSnapshot(role),
    () => emptyServer,
  );
  const localUnread = useSyncExternalStore(
    sub,
    () => getUnreadCount(role),
    () => 0,
  );

  const v2 = useNotificationsV2(role);

  // Merge local + V2 sem duplicação. Como local e V2 hoje cobrem fluxos
  // distintos (emit.ts suprime locais duplicados), basta concatenar por id.
  const items = useMemo(() => {
    const merged: Notification[] = [...v2.items, ...localItems];
    // Dedupe defensivo por (title|message|janela de 5s) caso algum fluxo
    // legado emita local enquanto a trigger também dispara.
    const seen = new Set<string>();
    return merged
      .filter((n) => {
        const bucket = Math.floor(n.createdAt / 5000);
        const key = `${n.title}|${n.message}|${bucket}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [v2.items, localItems]);

  const v2Unread = useMemo(
    () => v2.items.reduce((n, item) => (item.read ? n : n + 1), 0),
    [v2.items],
  );

  const unread = localUnread + v2Unread;

  const markAllRead = useCallback(() => {
    localMarkAllRead(role);
    void v2.markAllRead();
  }, [role, v2]);

  const clearAll = useCallback(() => {
    localClearAll(role);
    void v2.dismissAllVisible();
  }, [role, v2]);

  return { items, unread, markAllRead, clearAll };
}
