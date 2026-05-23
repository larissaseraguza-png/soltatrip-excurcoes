import { useEffect, useSyncExternalStore } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Singleton store: evita que cada componente que usa useAuth volte a
// passar por "loading=true" a cada montagem (causa principal do flicker).
type AuthState = { session: Session | null; user: User | null; loading: boolean };

let state: AuthState = { session: null, user: null, loading: true };
const listeners = new Set<() => void>();
let initialized = false;

function setState(next: Partial<AuthState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function init() {
  if (initialized) return;
  if (typeof window === "undefined") return; // nunca inicializa no servidor
  initialized = true;
  supabase.auth.getSession().then(({ data }) => {
    setState({ session: data.session, user: data.session?.user ?? null, loading: false });
  });
  supabase.auth.onAuthStateChange((_e, s) => {
    setState({ session: s, user: s?.user ?? null, loading: false });
  });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
const getSnapshot = () => state;
// Snapshot estável para SSR — evita hidratação divergente
const SSR_STATE: AuthState = { session: null, user: null, loading: true };
const getServerSnapshot = () => SSR_STATE;

export function useAuth() {
  useEffect(() => {
    init();
  }, []);
  if (typeof window !== "undefined" && !initialized) init();
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
