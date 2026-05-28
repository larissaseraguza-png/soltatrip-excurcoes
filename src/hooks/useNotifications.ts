import { useSyncExternalStore, useCallback } from "react";
import {
  subscribe,
  getSnapshot,
  getUnreadCount,
  markAllRead,
  clearAll,
  type NotifRole,
} from "@/lib/notifications/store";

const emptyServer: ReturnType<typeof getSnapshot> = [];

export function useNotifications(role: NotifRole) {
  const sub = useCallback((l: () => void) => subscribe(role, l), [role]);
  const items = useSyncExternalStore(
    sub,
    () => getSnapshot(role),
    () => emptyServer,
  );
  const unread = useSyncExternalStore(
    sub,
    () => getUnreadCount(role),
    () => 0,
  );
  return {
    items,
    unread,
    markAllRead: () => markAllRead(role),
    clearAll: () => clearAll(role),
  };
}
