## Objetivo
Transformar o fluxo do passageiro em: Reservar → Pagamento real (parcial ou total via Pix/cartão) → Escolha de poltrona → Confirmação. Remover todos os dados mockados da tela de pagamentos.

## 1. Banco de dados (migração)

**Alterar `passageiros`** (usado como reserva):
- Adicionar `total_price numeric not null default 0`
- Adicionar `amount_paid numeric not null default 0`
- Adicionar `payment_status text not null default 'pending_payment'` (`pending_payment | partial_payment | paid | cancelled`)
- Adicionar `seat_id uuid` (referência à poltrona)
- Coluna gerada `remaining_amount` = `total_price - amount_paid`

**Atualizar `pagamentos`**:
- Garantir `metodo` aceita: `pix`, `pix_parcelado`, `debito`, `credito`
- Adicionar `parcelas int default 1` (para crédito)
- Política: passageiro pode inserir/ver pagamentos da própria reserva

**Nova tabela `seats`**:
- `id`, `excursao_id`, `seat_number text`, `occupied boolean default false`, `reserved_by uuid` (user_id), `passageiro_id uuid`
- Único `(excursao_id, seat_number)`
- RLS: qualquer um vê poltronas de excursões publicadas; passageiro atualiza poltrona livre vinculando a si

**Trigger automático**:
- Ao inserir em `pagamentos` com status `confirmado`: somar em `passageiros.amount_paid`; se `>= total_price` marcar `paid`, senão `partial_payment`.
- Ao criar excursão: gerar `seats` 1..total_vagas automaticamente.

## 2. Frontend — Passageiro

**`passageiro.index.tsx`**: ao clicar "Reservar":
- criar `passageiros` com `user_id`, `excursao_id`, `nome`, `total_price = excursao.preco`, `payment_status = 'pending_payment'`
- navegar para `/passageiro/pagamentos?reserva={id}`

**`passageiro.pagamentos.tsx`** (reescrita completa, sem mock):
- Carregar reserva real + excursão + lista de pagamentos
- Mostrar: total, pago, restante, status
- Form: escolher método (Pix total, Pix parcial, Débito, Crédito com nº parcelas) + valor
- Submit: insere em `pagamentos` (status `confirmado` — mock de aprovação local até integração real)
- Quando `payment_status` mudar para `paid` (ou `partial_payment` com valor pago > 0), botão "Escolher poltrona" → `/passageiro/poltrona?reserva={id}`

**Nova rota `passageiro.poltrona.tsx`**:
- Grid de poltronas da excursão
- Marca ocupadas (cinza), disponíveis (clicável), da própria reserva (destaque)
- Ao selecionar: update `seats` (occupied, reserved_by, passageiro_id) + update `passageiros.seat_id` e `assento`
- Bloqueia seleção dupla via constraint

## 3. Detalhes técnicos

- Pagamento "aprovado" via inserção direta com `status=confirmado` (sem gateway real ainda — apenas registro)
- "Pix parcelado" = múltiplos pagamentos Pix até quitar (não é parcelamento bancário)
- Crédito: registra 1 pagamento com `parcelas = N` (informativo)
- Cancelamento de reserva libera poltrona (trigger ao update `payment_status='cancelled'`)

## 4. Arquivos
- `supabase/migrations/...` — alterações de schema, triggers, RLS, geração de seats
- `src/routes/passageiro.index.tsx` — reserva + navegação
- `src/routes/passageiro.pagamentos.tsx` — reescrita real
- `src/routes/passageiro.poltrona.tsx` — nova rota
- `src/routeTree.gen.ts` — regenerado automaticamente
