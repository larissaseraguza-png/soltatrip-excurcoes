// Resolve dinamicamente a rota de destino de uma notificação a partir de
// (type, role, data). Substitui o uso de `notification.link` salvo no banco
// para evitar rotas inválidas / "not found" quando estruturas mudam.

import type { NotifRole } from "./store";

export type NotifType =
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

type Payload = Record<string, unknown> | null | undefined;

function pick(data: Payload, ...keys: string[]): string | undefined {
  if (!data) return undefined;
  for (const k of keys) {
    const v = data[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

export function resolveNotificationRoute(
  type: string,
  role: NotifRole,
  data: Payload,
  excursaoIdFallback?: string | null,
): string | undefined {
  const excursaoId = pick(data, "excursao_id", "excursaoId") ?? excursaoIdFallback ?? undefined;
  const reservaId = pick(data, "reserva_id", "reservaId");
  const paxId = pick(data, "passageiro_id", "passageiroId", "pax_id");
  const itemId = pick(data, "item_id", "itemId");
  const pedidoId = pick(data, "pedido_id", "pedidoId");


  switch (type as NotifType) {
    // ---- Pagamentos ----
    case "payment.submitted":
      if (role === "excursionista" && excursaoId) {
        const focus = paxId ?? reservaId;
        return focus
          ? `/app/excursao/${excursaoId}/financeiro?focus=${focus}`
          : `/app/excursao/${excursaoId}/financeiro`;
      }
      return "/passageiro/pagamentos";
    case "payment.approved":
    case "payment.rejected":
    case "payment.manual_recorded":
    case "booking.paid":
      if (role === "passageiro") return "/passageiro/pagamentos";
      if (excursaoId) return `/app/excursao/${excursaoId}/financeiro`;
      return undefined;

    // ---- Reservas ----
    case "booking.created":
    case "booking.cancelled":
      if (role === "excursionista" && excursaoId) return `/app/excursao/${excursaoId}/passageiros`;
      if (role === "passageiro" && reservaId) return `/passageiro/reserva/${reservaId}`;
      if (role === "passageiro") return "/passageiro";
      return undefined;

    // ---- Check-in / Embarque ----
    case "checkin.done":
    case "checkin.undone":
    case "boarding.done":
    case "boarding.undone":
      if (role === "staff") return "/staff/checkin";
      if (role === "excursionista" && excursaoId) return `/app/excursao/${excursaoId}/checkin`;
      if (role === "passageiro") return "/passageiro/ticket";
      return undefined;

    // ---- Equipe (staff / convites) ----
    case "invitation.created":
    case "invitation.accepted":
    case "invitation.expired":
    case "team.added":
    case "team.removed":
      if (excursaoId) return `/app/excursao/${excursaoId}/equipe`;
      return "/app/perfil";

    // ---- Sócio ----
    case "socio.invited":
    case "socio.accepted":
      return "/app/perfil";

    // ---- Itens ----
    case "item.ordered":
      if (role === "excursionista" && excursaoId) return `/app/excursao/${excursaoId}/itens`;
      if (role === "passageiro" && reservaId) return `/passageiro/itens/${reservaId}`;
      return undefined;
    case "item.delivered":
    case "item.received_confirmed":
      if (role === "passageiro" && reservaId) return `/passageiro/itens/${reservaId}`;
      if (role === "excursionista" && excursaoId) return `/app/excursao/${excursaoId}/itens`;
      return undefined;

    // ---- Excursão ----
    case "excursion.published":
    case "excursion.updated":
      if (role === "passageiro" && reservaId) return `/passageiro/viagem/${reservaId}`;
      if (role === "passageiro") return "/passageiro/evento";
      if (excursaoId) return `/app/excursao/${excursaoId}`;
      return undefined;
    case "excursion.cancelled":
      if (role === "passageiro") return "/passageiro";
      if (excursaoId) return `/app/excursao/${excursaoId}`;
      return undefined;

    // ---- System / fallback ----
    case "system.info":
    case "system.warning":
    default:
      // último recurso: usa paxId para staff
      if (role === "staff" && paxId) return `/staff/passageiro/${paxId}`;
      if (excursaoId && role === "excursionista") return `/app/excursao/${excursaoId}`;
      void itemId;
      return undefined;
  }
}
