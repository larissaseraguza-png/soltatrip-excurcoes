// Sync leve entre áreas (Staff / Excursionista / Passageiro).
// NÃO é realtime — apenas um barramento local + cross-tab via BroadcastChannel
// que dispara invalidação de queries após ações importantes.
// Uso: emitSync("pagamento") após salvar; subscribeSync(handler) para ouvir.

export type SyncTopic =
  | "pagamento"
  | "reserva"
  | "checkin"
  | "embarque"
  | "dados";

type Handler = (topic: SyncTopic) => void;

// Mapa tópico → prefixos (queryKey[0]) que devem ser invalidados.
// Mantido aqui para que o listener global no __root saiba escopar
// a invalidação apenas ao que é relevante, evitando piscar a tela inteira.
export const SYNC_TOPIC_KEYS: Record<SyncTopic, readonly string[]> = {
  pagamento: [
    "pagamentos",
    "pagamentos-pax",
    "pagto-passageiros",
    "pend-pags",
    "reservas-pagto",
    "reserva-pagamentos",
    "organizer-payment-info",
    "passageiro-fin",
    "fin-itens",
    "fin-onibus",
    "fin-passageiros",
    "fin-pedidos",
    "fin-pontos",
    "staff-fin-pagamentos",
    "staff-fin-pax",
    "staff-fin-reservas",
    "staff-pax-pgto",
  ],
  reserva: [
    "minhas-reservas",
    "reserva-passageiros",
    "reserva-grupo",
    "reserva-seats",
    "reserva-pontos",
    "reserva-pedidos-itens",
    "passageiros",
    "pax-pedidos",
    "pax-itens",
    "dashboard-pax",
    "org-pax-all",
    "pend-pax",
    "pend-ex",
    "staff-passageiros",
    "staff-pax-detalhe",
  ],
  checkin: [
    "passageiros-checkin",
    "staff-checkin-pax",
    "staff-checkins",
    "staff-festa-stats",
    "passageiros",
    "dashboard-pax",
  ],
  embarque: [
    "seats",
    "reserva-seats",
    "staff-seats",
    "staff-onibus-seats",
    "pontos",
    "pontos-counts",
    "pontos-poltrona",
    "reserva-pontos",
    "staff-pontos",
    "staff-pax-ponto",
    "pax-poltrona",
    "onibus",
    "onibus-detail",
    "onibus-info",
    "onibus-ocupacao",
    "onibus-primeiro-embarque",
    "staff-onibus",
    "staff-onibus-pax",
    "reserva-passageiros",
    "reserva-grupo",
    "pagto-passageiros",
  ],
  dados: [
    "profile",
    "profile-stats",
    "equipe",
    "staff-equipe-list",
    "socios-raiz",
    "invites",
    "invites-socios-raiz",
    "excursao",
    "evento-hub",
  ],
};

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
