import { useEffect, useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type AppRole = "excursionista" | "staff" | "passageiro";

const ACTIVE_KEY = "soltatrip:perfil";

/**
 * Cache de TODOS os papéis do usuário (um usuário pode ter mais de um
 * — ex: staff que também compra como passageiro). A role "ativa" fica
 * em localStorage para permitir alternância sem novo login.
 */
type RolesEntry = { roles: AppRole[]; loading: boolean };
const cache = new Map<string, RolesEntry>();
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

async function loadRoles(userId: string) {
  if (inFlight.has(userId)) return inFlight.get(userId)!;
  const p = (async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = ((data ?? []).map((r) => r.role as AppRole)).filter(
      (r): r is AppRole => r === "excursionista" || r === "staff" || r === "passageiro",
    );
    cache.set(userId, { roles, loading: false });
    inFlight.delete(userId);
    notify();
  })();
  inFlight.set(userId, p);
  return p;
}

const LOADING_ENTRY: RolesEntry = { roles: [], loading: true };
const NO_USER_ENTRY: RolesEntry = { roles: [], loading: false };

function readActive(): AppRole | null {
  try {
    const v = localStorage.getItem(ACTIVE_KEY);
    if (v === "excursionista" || v === "staff" || v === "passageiro") return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function setActiveRole(role: AppRole) {
  try {
    localStorage.setItem(ACTIVE_KEY, role);
  } catch {
    /* ignore */
  }
  notify();
}

/** Invalida o cache de roles do usuário e força recarga. Útil após
 * aceitar convite de staff ou completar compra como passageiro. */
export function invalidateRoles(userId?: string | null) {
  if (userId) {
    cache.delete(userId);
    inFlight.delete(userId);
    loadRoles(userId);
  } else {
    cache.clear();
    inFlight.clear();
  }
  notify();
}

export type RoleSnapshot = {
  /** Papel ativo (preferência salva, ou primeiro disponível). */
  role: AppRole | null;
  /** Todos os papéis que o usuário possui. */
  roles: AppRole[];
  loading: boolean;
};

export function useRoleForUser(user: User | null, authLoading: boolean): RoleSnapshot {
  const userId = user?.id ?? null;

  useEffect(() => {
    if (authLoading || !userId) return;
    if (!cache.has(userId)) {
      cache.set(userId, LOADING_ENTRY);
      loadRoles(userId);
    }
  }, [userId, authLoading]);

  return useSyncExternalStore(
    subscribe,
    () => {
      if (authLoading) return LOADING_ENTRY as RoleSnapshot;
      if (!userId) return NO_USER_ENTRY as RoleSnapshot;
      const entry = cache.get(userId) ?? LOADING_ENTRY;
      if (entry.loading) return entry as RoleSnapshot;
      const active = readActive();
      const role =
        active && entry.roles.includes(active) ? active : entry.roles[0] ?? null;
      return { role, roles: entry.roles, loading: false };
    },
    () => LOADING_ENTRY as RoleSnapshot,
  );
}

export function useRole(): RoleSnapshot {
  const { user, loading: authLoading } = useAuth();
  return useRoleForUser(user, authLoading);
}

export const roleHome: Record<AppRole, "/app" | "/staff" | "/passageiro"> = {
  excursionista: "/app",
  staff: "/staff",
  passageiro: "/passageiro",
};
