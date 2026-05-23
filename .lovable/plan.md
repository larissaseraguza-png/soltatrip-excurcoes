## Objetivo
Transformar o sistema para que cada vaga comprada represente um passageiro individual com sua própria poltrona, ponto de embarque e QR Code.

## Banco de dados (migração)

**`passageiros`** — novos campos:
- `comprador_id uuid` — referência ao usuário que pagou (o "titular" da compra)
- `email text` — email do passageiro (para convidar)
- `convite_token text` — token único para passageiro adicional reivindicar acesso
- Manter `user_id` como dono efetivo da reserva (nullable até o convidado fazer login)

**Trigger ajustado**:
- Quando um passageiro paga, libera escolha de poltrona/ponto (já existe).
- Trigger de "lock" continua valendo: depois de escolher poltrona/ponto, só o organizador altera.

**Política RLS**:
- Comprador pode visualizar todas as reservas que ele criou (via `comprador_id = auth.uid()`).
- Passageiro convidado, após aceitar o convite, vê apenas a própria (via `user_id = auth.uid()`).
- Comprador pode inserir múltiplas reservas (uma por vaga) na mesma excursão.

**Função RPC `claim_passageiro_invite(token)`**:
- Vincula `user_id = auth.uid()` à reserva, atribui papel passageiro, marca convite como usado.

## Frontend

**`passageiro.index.tsx`** — botão "Reservar":
- Abre modal/tela perguntando **quantidade de vagas** (1..N respeitando vagas disponíveis).
- Se >1: formulário para preencher nome/telefone/email de cada passageiro adicional (titular usa próprio cadastro).
- Cria N registros em `passageiros` com `comprador_id = user.id`, `total_price = preco`, `payment_status = pending_payment`.
- Para passageiros adicionais: gera `convite_token`, deixa `user_id = null`.
- Redireciona para nova tela de gerenciamento da compra.

**Nova rota `passageiro.compra.$id.tsx`** (opcional, simplificação: mostrar lista no `passageiro.index`):
- Lista as N reservas da compra; cada uma com botão "Abrir reserva" → `/passageiro/reserva/{id}`.
- Botão "Copiar link de convite" para os passageiros adicionais.

**`passageiro.reserva.$id.tsx`** — sem mudança estrutural (já funciona por reserva individual):
- Cada reserva tem seu próprio pagamento/poltrona/ponto/QR Code.
- Comprador pode pagar/escolher pelas reservas de quem ele convidou (RLS permite via `comprador_id`).
- Convidado, após `claim`, acessa a própria.

**Nova rota `invite.passageiro.$token.tsx`**:
- Convidado faz login (ou cria conta) → chama `claim_passageiro_invite` → redireciona para `/passageiro/reserva/{id}`.

**QR Code**: já condicionado a `status === "paid"` (mantém).

**Poltrona/ponto**: já liberados após `amount_paid > 0` e bloqueados após escolha (triggers existentes).

## Arquivos
- `supabase/migrations/...` — campos novos em `passageiros`, RLS ajustada, RPC `claim_passageiro_invite`
- `src/routes/passageiro.index.tsx` — fluxo de quantidade + dados dos adicionais
- `src/routes/invite.passageiro.$token.tsx` — nova rota
- `src/routes/passageiro.reserva.$id.tsx` — exibir botão "compartilhar link" se for reserva de convidado
- `src/integrations/supabase/types.ts` — regenerado
- `src/routeTree.gen.ts` — auto
