import { useEffect, useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type AppRole = "excursionista" | "staff" | "passageiro";

// Cache de role por user_id em escopo de módulo: a primeira resolução
// fica em memória e novas montagens não voltam a exibir loading.
type RoleEntry = { role: AppRole | null; loading: boolean };
const cache = new Map<string, RoleEntry>();
const inFlight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

async function loadRole(userId: string) {
  if (inFlight.has(userId)) return inFlight.get(userId)!;
  const p = (async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    cache.set(userId, { role: (data?.role as AppRole) ?? null, loading: false });
    inFlight.delete(userId);
    notify();
  })();
  inFlight.set(userId, p);
  return p;
}

const LOADING_ENTRY: RoleEntry = { role: null, loading: true };
const NO_USER_ENTRY: RoleEntry = { role: null, loading: false };

export function useRoleForUser(user: User | null, authLoading: boolean) {
  const userId = user?.id ?? null;

  useEffect(() => {
    if (authLoading || !userId) return;
    if (!cache.has(userId)) {
      cache.set(userId, LOADING_ENTRY);
      loadRole(userId);
    }
  }, [userId, authLoading]);

  const snapshot = useSyncExternalStore(
    subscribe,
    () => {
      if (authLoading) return LOADING_ENTRY;
      if (!userId) return NO_USER_ENTRY;
      return cache.get(userId) ?? LOADING_ENTRY;
    },
    () => LOADING_ENTRY,
  );

  return snapshot;
}

export function useRole() {
  const { user, loading: authLoading } = useAuth();
  return useRoleForUser(user, authLoading);
}

export const roleHome: Record<AppRole, "/app" | "/staff" | "/passageiro"> = {
  excursionista: "/app",
  staff: "/staff",
  passageiro: "/passageiro",
};
