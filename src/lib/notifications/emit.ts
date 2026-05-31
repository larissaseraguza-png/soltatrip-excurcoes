// F2 consolidado: este módulo foi descontinuado.
//
// Toda emissão de eventos de negócio (pagamento, reserva, passageiro, itens,
// convites, staff, sócio, check-in, embarque, alteração de excursão) agora
// passa exclusivamente por:
//
//  1) Triggers de banco (pagamentos e reservas)
//  2) RPC `emit_business_event` — veja `src/lib/notifications/business.ts`
//
// Nada aqui deve gravar em localStorage. Imports antigos a `notify.*` foram
// removidos dos call sites; este arquivo permanece apenas como guardrail
// caso algum import legado escape em refactors.

export {};
