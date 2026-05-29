// Sync leve entre áreas (Staff / Excursionista / Passageiro).
// NÃO é realtime — apenas um barramento local + cross-tab via BroadcastChannel
// que dispara invalidação de queries após ações importantes.
// Uso: emitSync("pagamento") após salvar; useSyncBus(handler) para ouvir.

export type SyncTopic =
  | "pagamento"
  | "reserva"
  | "checkin"
  | "embarque"
  | "dados";

type Handler = (topic: SyncTopic) => void;

const listeners = new Set<Handler>();
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (channel) return channel;
  try {
    channel = new BroadcastChannel("soltatrip-sync");
    channel.onmessage = (ev) => {
      const t = ev?.data?.topic as SyncTopic | undefined;
      if (!t) return;
      listeners.forEach((fn) => {
        try { fn(t); } catch {}
      });
    };
  } catch {
    channel = null;
  }
  return channel;
}

export function emitSync(topic: SyncTopic) {
  if (typeof window === "undefined") return;
  // Local (mesma aba)
  listeners.forEach((fn) => {
    try { fn(topic); } catch {}
  });
  // Cross-tab (mesmo device)
  try {
    getChannel()?.postMessage({ topic, ts: Date.now() });
  } catch {}
}

export function subscribeSync(fn: Handler): () => void {
  listeners.add(fn);
  getChannel(); // garante inicialização
  return () => { listeners.delete(fn); };
}
