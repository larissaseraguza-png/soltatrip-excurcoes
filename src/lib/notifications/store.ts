// Local-only notification store. No realtime, no backend sync.
// Persists per role in localStorage. Use emit helpers in ./emit.ts.

export type NotifRole = "passageiro" | "staff" | "excursionista";
export type NotifTone = "green" | "pink" | "purple" | "blue" | "amber";
export type NotifIconKey =
  | "credit-card"
  | "clock"
  | "ticket"
  | "qr-code"
  | "bus"
  | "calendar"
  | "user-plus"
  | "check-circle"
  | "log-out"
  | "edit"
  | "shield"
  | "users";

export type NotifCategory =
  | "pagamentos"
  | "reservas"
  | "checkin"
  | "embarque"
  | "alteracoes"
  | "staff"
  | "socio";

export type Notification = {
  id: string;
  role: NotifRole;
  icon: NotifIconKey;
  tone: NotifTone;
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
  /** Rota interna para abrir ao clicar na notificação. */
  link?: string;
  /** Categoria para filtros do painel. */
  category?: NotifCategory;
};

const MAX_PER_ROLE = 50;
const STORAGE_PREFIX = "soltanois:notif:v1:";
const READ_AT_PREFIX = "soltanois:notif:readAt:v1:";

type Listener = () => void;
const listeners = new Map<NotifRole, Set<Listener>>();
const cache = new Map<NotifRole, Notification[]>();
const readAtCache = new Map<NotifRole, number>();

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function load(role: NotifRole): Notification[] {
  if (cache.has(role)) return cache.get(role)!;
  if (!isBrowser()) {
    cache.set(role, []);
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + role);
    const list: Notification[] = raw ? JSON.parse(raw) : [];
    cache.set(role, Array.isArray(list) ? list : []);
  } catch {
    cache.set(role, []);
  }
  return cache.get(role)!;
}

function loadReadAt(role: NotifRole): number {
  if (readAtCache.has(role)) return readAtCache.get(role)!;
  if (!isBrowser()) return 0;
  const v = Number(localStorage.getItem(READ_AT_PREFIX + role) || 0);
  readAtCache.set(role, v);
  return v;
}

function save(role: NotifRole, list: Notification[]) {
  cache.set(role, list);
  if (isBrowser()) {
    try {
      localStorage.setItem(STORAGE_PREFIX + role, JSON.stringify(list));
    } catch {
      /* ignore quota */
    }
  }
  listeners.get(role)?.forEach((l) => l());
}

function saveReadAt(role: NotifRole, ts: number) {
  readAtCache.set(role, ts);
  if (isBrowser()) {
    try {
      localStorage.setItem(READ_AT_PREFIX + role, String(ts));
    } catch {
      /* ignore */
    }
  }
  listeners.get(role)?.forEach((l) => l());
}

export function subscribe(role: NotifRole, l: Listener) {
  let set = listeners.get(role);
  if (!set) {
    set = new Set();
    listeners.set(role, set);
  }
  set.add(l);
  return () => set!.delete(l);
}

export function getSnapshot(role: NotifRole): Notification[] {
  return load(role);
}

export function getUnreadCount(role: NotifRole): number {
  const list = load(role);
  const readAt = loadReadAt(role);
  return list.reduce((n, item) => (item.createdAt > readAt ? n + 1 : n), 0);
}

export function markAllRead(role: NotifRole) {
  saveReadAt(role, Date.now());
}

export function clearAll(role: NotifRole) {
  save(role, []);
}

export type AddInput = Omit<Notification, "id" | "createdAt" | "read">;

export function addNotification(input: AddInput) {
  const list = load(input.role);
  // Dedupe: skip if same role+title+message added in last 3s.
  const now = Date.now();
  const recent = list[0];
  if (
    recent &&
    recent.title === input.title &&
    recent.message === input.message &&
    now - recent.createdAt < 3000
  ) {
    return;
  }
  const next: Notification = {
    ...input,
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    read: false,
  };
  const updated = [next, ...list].slice(0, MAX_PER_ROLE);
  save(input.role, updated);
}

export function formatRelative(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const s = Math.floor(diff / 1000);
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d atrás`;
  return new Date(ts).toLocaleDateString("pt-BR");
}
