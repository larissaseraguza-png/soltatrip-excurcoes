## Objetivo

Hoje cada vaga vira uma reserva separada com pagamento próprio — fluxo picotado. Vamos consolidar em **UMA reserva de grupo** por compra, com pagamento único, mas mantendo poltrona / embarque / QR Code individuais por passageiro.

## Modelo de dados

Nova tabela **`reservas`** (a "compra" do grupo):

- `id`, `excursao_id`, `comprador_id`
- `quantidade` (int)
- `total_price` (soma das vagas)
- `amount_paid`, `payment_status` (`pending_payment` | `partial_payment` | `paid` | `cancelled`)
- `created_at`, `updated_at`

Alterações em **`passageiros`**:

- Adicionar `reserva_id` (FK → `reservas.id`, NOT NULL nas novas linhas)
- Remover responsabilidade financeira: `total_price` / `amount_paid` / `payment_status` deixam de ser usados aqui (mantidos por compatibilidade, mas a verdade vai pra `reservas`)
- Mantém `nome`, `email`, `user_id`, `comprador_id`, `convite_token`, `seat_id`, `ponto_embarque_id`, `qr_code`

Alterações em **`pagamentos`**:

- Adicionar `reserva_id` (FK → `reservas.id`) — passa a ser o vínculo principal
- `passageiro_id` vira opcional (legado)

Triggers:

- `apply_pagamento_to_reserva` → atualiza `reservas.amount_paid` / `payment_status` (não mais por passageiro)
- Quando `reservas.payment_status = 'paid'` → marca todos os passageiros do grupo como confirmados
- Mantém `lock_passageiro_choices` (bloqueia troca de poltrona/embarque depois de definidos, exceto organizador)

RLS:

- `reservas`: comprador vê/edita as próprias; organizador da excursão vê tudo; staff vê (leitura)
- `passageiros`: comprador da reserva vê todos os passageiros do grupo; passageiro vinculado (`user_id`) vê o seu; organizador/staff como hoje
- `pagamentos`: comprador vê pagamentos da própria reserva

## Fluxo no frontend

**1. `passageiro.index.tsx` — tela da excursão** (já tem seletor de quantidade, vamos simplificar):
- Seletor de quantidade 1..N
- Para cada vaga, formulário: nome + email (titular pré-preenchido, demais editáveis)
- Botão "Continuar" → cria 1 `reservas` + N `passageiros` (com `reserva_id` setado) numa transação (RPC `criar_reserva_grupo`)
- Redireciona para nova tela `/passageiro/reserva/{reserva_id}`

**2. Nova rota `/passageiro/reserva/$id`** — centro de comando da reserva:
Substitui a tela atual `passageiro.reserva.$id.tsx` (que era por passageiro). Agora mostra:
- Header: excursão, total, pago, restante, status do pagamento
- Bloco de pagamento (Pix fracionado consolidado: paga uma parte, atualiza `amount_paid`)
- Lista de passageiros do grupo. Cada card:
  - Nome + email + status (vinculado / convidado pendente)
  - Botão **"Escolher poltrona"** (liberado quando `amount_paid > 0`)
  - Botão **"Escolher embarque"** (liberado quando `amount_paid > 0`)
  - Quando escolhidos: mostra poltrona + embarque travados
  - Quando `payment_status = paid`: mostra QR Code individual
  - Para convidados sem `user_id`: botão "Copiar link de convite"

**3. `passageiro.poltrona.tsx` e nova `passageiro.embarque.tsx`**:
- Recebem `?pax={passageiro_id}` na URL
- Permitem ao comprador (ou ao próprio convidado autenticado) escolher para aquele passageiro específico
- Travam após escolha (já implementado via trigger)

**4. Lista "Minhas viagens" (`passageiro.index` aba minhas)**:
- Passa a listar **reservas** (não mais passageiros individuais)
- Cada card: excursão, qtd de passageiros, status pagamento

**5. Convite (`invite.passageiro.$token`)**:
- Continua funcionando: vincula `user_id` ao passageiro específico do grupo
- Após claim, convidado vê apenas seu próprio cartão (QR/poltrona/embarque)

**6. Pagamentos antigos (`passageiro.pagamentos.tsx`)**:
- Aposentar/redirecionar — pagamento agora vive dentro da tela da reserva

## Sincronização excursionista/staff

As views de passageiros/financeiro do organizador já consultam as tabelas — vão refletir o novo modelo após ajustar os selects para juntar com `reservas` quando precisarem do status financeiro.

## Migração de dados existentes

Para cada `passageiros` órfão (sem `reserva_id`): criar uma `reservas` 1-pra-1 e setar `reserva_id`. Copiar `total_price`/`amount_paid`/`payment_status`/`comprador_id`. Ligar `pagamentos.reserva_id` correspondente.

## Arquivos

**Banco**
- Nova migration: tabela `reservas`, FK `passageiros.reserva_id`, FK `pagamentos.reserva_id`, novos triggers, RLS, RPC `criar_reserva_grupo(excursao_id, passageiros jsonb)`, backfill dos registros existentes

**Frontend**
- `src/routes/passageiro.index.tsx` — modal de quantidade + formulário de passageiros, criar reserva via RPC, listar reservas (não passageiros)
- `src/routes/passageiro.reserva.$id.tsx` — reescrita: agora é a tela da reserva-grupo
- `src/routes/passageiro.poltrona.tsx` — aceitar `?pax=`
- `src/routes/passageiro.embarque.tsx` (nova) — escolher ponto por passageiro
- `src/routes/passageiro.pagamentos.tsx` — remover ou redirecionar para reserva
- `src/integrations/supabase/types.ts` — regenerado

## Pontos de atenção

- Migração precisa preservar reservas existentes (sem quebrar quem já tá no meio do fluxo)
- Pagamentos antigos continuam válidos via `passageiro_id` legado
- RLS precisa permitir comprador ler todos os passageiros do grupo mesmo sem ser `user_id` deles (já temos `comprador_id`, só ajustar políticas para também aceitar via `reserva_id`)
