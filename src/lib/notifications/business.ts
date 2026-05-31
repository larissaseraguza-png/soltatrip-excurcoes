// Camada única de emissão de eventos de negócio fora de triggers.
// Sempre que possível, prefira chamar `emitBusinessEvent` em vez de inserir
// notificações no banco direto ou empilhar várias chamadas de `notify.*`.
//
// A RPC `emit_business_event` (SECURITY DEFINER) faz:
//  - autorização do chamador contra a excursão alvo;
//  - resolução multi-destinatário a partir de "papéis" (organizer_root,
//    organizer_socios, staff_excursao, passageiro_user, passageiro_comprador,
//    reserva_comprador) e/ou uma lista explícita de UUIDs;
//  - deduplicação;
//  - exclusão automática do ator (actor_id != recipient_id);
//  - dedupe_key por destinatário para evitar repetição.

import { supabase } from "@/integrations/supabase/client";

export type BusinessEventType =
  // payment.* e booking.created/paid ficam por conta das triggers DB.
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
  | "excursion.updated"
  | "excursion.cancelled";

export type RecipientRole =
  | "organizer_root"
  | "organizer_socios"
  | "staff_excursao"
  | "passageiro_user"
  | "passageiro_comprador"
  | "reserva_comprador";

export type EmitBusinessEventInput = {
  type: BusinessEventType;
  excursaoId: string;
  reservaId?: string | null;
  passageiroId?: string | null;
  pagamentoId?: string | null;
  title?: string;
  message?: string;
  link?: string;
  data?: Record<string, unknown>;
  recipientRoles?: RecipientRole[];
  extraRecipients?: string[];
  dedupeKey?: string;
};

/**
 * Emite um evento de negócio via RPC unificada.
 * Falhas são logadas mas não propagadas — notificação nunca deve quebrar
 * o fluxo principal do app.
 */
export async function emitBusinessEvent(input: EmitBusinessEventInput): Promise<void> {
  try {
    const { error } = await supabase.rpc("emit_business_event", {
      _type: input.type,
      _excursao_id: input.excursaoId,
      _reserva_id: input.reservaId ?? null,
      _passageiro_id: input.passageiroId ?? null,
      _pagamento_id: input.pagamentoId ?? null,
      _title: input.title ?? null,
      _message: input.message ?? null,
      _link: input.link ?? null,
      _data: (input.data ?? {}) as never,
      _recipient_roles: input.recipientRoles ?? [],
      _extra_recipients: input.extraRecipients ?? [],
      _dedupe_key: input.dedupeKey ?? null,
    } as never);
    if (error) {
      console.warn("[business-event] rpc error:", error.message, input.type);
    }
  } catch (e) {
    console.warn("[business-event] threw:", e);
  }
}
