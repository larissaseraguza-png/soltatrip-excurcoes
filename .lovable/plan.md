# Plano de Execução — Central de Notificações V2

> **Escopo desta autorização:** apenas documentar a Fase 0. Nenhuma migration, tabela, RPC, trigger ou arquivo será alterado nesta etapa. Esta é a "lista de embarque" que será executada quando você autorizar F0 propriamente dita.

> **Observação importante descoberta agora:** já existe no banco a tabela `public.notificacoes` (campos: `id`, `user_id`, `excursao_id`, `titulo`, `mensagem`, `tipo`, `link`, `lida`, `lida_em`, `created_at`). Ela está **órfã**: o código nunca lê nem escreve nela, não tem policy de INSERT, não tem trigger. Tratamento: **renomear no projeto V2 para `notifications`** (nome novo, schema novo expandido conforme projeto técnico) e deixar `notificacoes` para descarte em F4. **Não migramos dados** (a tabela está vazia/sem uso).

---

## 1. Tabelas a criar (F0)

| Tabela | Função | Quando |
|---|---|---|
| `public.notifications` | Inbox principal (1 linha = 1 entrega) com todos os campos do projeto técnico: `recipient_id`, `recipient_role`, `actor_id`, `tenant_id`, `excursao_id`, `reserva_id`, `passageiro_id`, `pagamento_id`, `invite_id`, `type`, `category`, `severity`, `title`, `body`, `data jsonb`, `link`, `dedupe_key`, `delivered_at`, `read_at`, `dismissed_at`, `resolved_at`, `expires_at`, `priority`, `channel text[]` | F0 |
| `public.notification_preferences` | Opt-in/opt-out por `(user_id, type, channel)` — placeholder, sem uso em F1 | F0 (schema only) |

**Tipos novos:** `notification_type` (enum) e `notification_category` (enum) — ou `text` com `CHECK`, definir na hora.

**Índices:**
- `(recipient_id, recipient_role, delivered_at DESC)`
- `(recipient_id, recipient_role) WHERE read_at IS NULL AND dismissed_at IS NULL`
- `(excursao_id)`, `(reserva_id)`, `(tenant_id)`
- `UNIQUE (recipient_id, dedupe_key) WHERE dedupe_key IS NOT NULL`

**GRANTs (obrigatório):**
- `GRANT SELECT, UPDATE ON public.notifications TO authenticated` (UPDATE só para `read_at`/`dismissed_at` via policy WITH CHECK; INSERT/DELETE **bloqueados**)
- `GRANT ALL ON public.notifications TO service_role`
- Mesmo padrão para `notification_preferences` (incluindo INSERT/UPDATE pelo dono)

**RLS:**
- `SELECT/UPDATE`: `recipient_id = auth.uid()`
- `INSERT/DELETE`: sem policy → somente `SECURITY DEFINER` ou `service_role`

---

## 2. RPCs a criar (F0)

| RPC | Propósito | Caller |
|---|---|---|
| `notify_emit(p jsonb)` | **Função central** `SECURITY DEFINER`. Resolve destinatários, aplica dedupe, insere N linhas. Recebe `type` + escopo (`excursao_id`/`reserva_id`/`passageiro_id`/`pagamento_id`/`invite_id`) + `data` + `actor_id` opcional. | Triggers internos + outras RPCs |
| `notify_resolve_recipients(p_type text, p_scope jsonb) returns setof uuid` | Helper interno: dado um tipo + escopo, devolve a lista de `(recipient_id, recipient_role)`. Ex.: `payment.submitted` → raiz da excursão + todos sócios ativos. | Chamado por `notify_emit` |
| `notification_mark_read(p_id uuid)` | Marca uma notificação do próprio usuário como lida. | Cliente |
| `notification_mark_all_read(p_role app_role)` | Marca todas de um bucket de role. | Cliente |
| `notification_dismiss(p_id uuid)` | Arquiva. | Cliente |
| `notification_unread_count(p_role app_role) returns int` | Contador rápido. | Cliente |

**Não criar GRANT EXECUTE para anon/authenticated em `notify_emit` e `notify_resolve_recipients`** (memória core: SECURITY DEFINER de triggers internos não devem ser expostos).

**Conceder EXECUTE a `authenticated`** em: `notification_mark_read`, `notification_mark_all_read`, `notification_dismiss`, `notification_unread_count`.

---

## 3. Triggers iniciais (F0 — apenas pagamentos e reservas)

Estes 2 domínios cobrem ~70% dos call sites atuais e já têm triggers maduros (`apply_pagamento_to_reserva_v2`, `recalc_passageiro_payments`). Reaproveitamos o ponto de extensão.

| Trigger | Tabela | Evento → `type` |
|---|---|---|
| `trg_notify_pagamento_inserted` | `pagamentos` AFTER INSERT | status=`pendente` → `payment.submitted` |
| `trg_notify_pagamento_status` | `pagamentos` AFTER UPDATE OF status | `pendente→confirmado` → `payment.approved`; `pendente→recusado` → `payment.rejected` |
| `trg_notify_reserva_inserted` | `reservas` AFTER INSERT | `booking.created` |
| `trg_notify_reserva_paid` | `reservas` AFTER UPDATE OF payment_status | `pending→paid` → `booking.confirmed` |

**Demais domínios (checkin, embarque, convites, equipe, sócio, excursão, itens) NÃO entram em F0** — continuam emitindo via `notify.*` localStorage. Entram em F2/F3 conforme cronograma.

---

## 4. Arquivos do projeto a modificar

### F0 (somente banco — **zero arquivos do projeto alterados**)
- Apenas a migration. `src/integrations/supabase/types.ts` é regenerado automaticamente.

### F1 (fachada dual — modificações cirúrgicas)
| Arquivo | Mudança |
|---|---|
| `src/lib/notifications/emit.ts` | Cada `notify.*.<evento>` passa a chamar tanto `addNotification` (mantém) quanto `supabase.rpc('notify_emit', …)` (novo). Onde já há trigger no banco (pagamento/reserva em F1), a chamada à RPC é suprimida para evitar duplicata — a trigger é a fonte. |
| `src/lib/notifications/store.ts` | Sem mudança. |
| `src/hooks/useNotifications.ts` | Reescrito para modo dual: continua expondo `items`, `unread`, `markAllRead`, `clearAll`, mas internamente lê localStorage **e** `notifications` via React Query (com `useRealtimeSync` desligado por enquanto), mescla, dedupe por `dedupe_key`/timestamp. |
| `src/lib/notifications/v2.ts` *(novo)* | Wrapper tipado das RPCs de leitura/marcação. |

### F2 (feature flag + Realtime opt-in)
| Arquivo | Mudança |
|---|---|
| `src/config/flow-mode.ts` | Adicionar flag `notifications_v2` (default false em prod, true para voluntários). |
| `src/hooks/useNotifications.ts` | Quando flag true: ignora localStorage, lê só `notifications`, ativa `useRealtimeSync` em `notifications` filtrado por `recipient_id`. |
| `src/components/NotificationPanel.tsx` | Adiciona ação "marcar como lida" individual (hoje só tem "marcar todas"). |

### F3 (cobertura completa de triggers)
| Arquivo | Mudança |
|---|---|
| `src/lib/notifications/emit.ts` | Remove emissão local de cada `type` à medida que sua trigger entra em produção (linha-a-linha, evento por evento). |

### F4 (cleanup)
| Arquivo | Mudança |
|---|---|
| `src/lib/notifications/store.ts` | **Removido**. |
| `src/lib/notifications/emit.ts` | Reduzido a wrapper sobre `notify_emit` (ou removido se todas as emissões viraram triggers). |
| ~15 call sites de `notify.*` em rotas | **Não tocados** se a fachada absorver toda a mudança; auditar e remover apenas as chamadas que viraram trigger. |
| Migration de cleanup | `DROP TABLE public.notificacoes` (órfã); limpeza opcional de `localStorage` no `useAuth` logout. |

---

## 5. Componentes afetados

| Componente | Fase | Impacto |
|---|---|---|
| `NotificationBell` (`src/components/NotificationBell.tsx`) | F1+ | Nenhuma mudança de API — continua consumindo `useNotifications(role)`. Badge passa a refletir contador do banco quando flag ativa. |
| `NotificationPanel` (`src/components/NotificationPanel.tsx`) | F2 | Ganha botão "marcar como lida" por item; ganha filtro opcional por excursão atual. |
| `RoleHeader`, `passageiro/Shell`, `staff/Shell`, `excursionista/Shell` | nenhuma | Apenas hospedam o Bell — não tocados. |

---

## 6. Fluxos que **continuam** no sistema atual durante migração

Até F3 concluir cada domínio, **continuam emitindo via localStorage**:

- Check-in / desembarque (`staff.checkin.tsx`, `app.excursao.$id.checkin.tsx`)
- Alteração de poltrona / ponto de embarque (`passageiro.poltrona.tsx`)
- Aceitar convite staff/sócio (`invite.staff.$token.tsx`)
- Aceitar convite passageiro (`invite.passageiro.$token.tsx`)
- Criação manual de passageiro (`app.excursao.$id.passageiros.tsx` linhas 585–586)
- Compra de itens (`passageiro.itens.$id.tsx`)
- Confirmação de pagamento pelo organizador na tela de **passageiros** (linhas 837–839) — *coexiste* com a trigger nova de F0, motivo pelo qual a fachada **suprime** a emissão local quando a trigger cobre.

---

## 7. Fluxos que migram **primeiro** (F1 sob trigger F0)

1. **`payment.submitted`** — passageiro registra pagamento (`passageiro.pagamentos.tsx`). Caminho mais alto-volume.
2. **`payment.approved` / `payment.rejected`** — confirmação manual pelo excursionista (`app.excursao.$id.financeiro.tsx`, `app.excursao.$id.passageiros.tsx`).
3. **`booking.created`** — quando vem por `criar_reserva_grupo` RPC ou INSERT direto em `reservas`.
4. **`booking.confirmed`** — disparado por trigger quando `payment_status` vira `paid`.

Esses 4 tipos cobrem o feed mais sensível (financeiro) e são os mais auditáveis (existe `recalc_passageiro_payments` para validar consistência).

---

## 8. Riscos identificados

### Pagamentos (risco ALTO — deploy controlado)
- **Duplicata transitória em F1:** trigger emite + fachada local emite → painel mostra 2 itens. **Mitigação:** suprimir lado local imediatamente quando a trigger correspondente está ativa (não esperar F3). Dedupe por `dedupe_key = 'payment.submitted:<pagamento_id>'` é a rede de segurança.
- **Trigger emitindo para destinatários errados:** se `notify_resolve_recipients` retornar lista incompleta (ex.: esquecer sócios), excursionista raiz vê mas sócio não. **Mitigação:** F0 inclui testes de resolução isolados antes de F1 ligar a fachada.
- **Pagamento manual do organizador (`organizer_create_manual_passageiro` insere em `pagamentos` com status='confirmado'):** vai disparar `payment.approved` para o passageiro mesmo sem ele ter enviado nada. **Aceitável** (passageiro deve saber que foi creditado), mas precisa de `data` claro indicando origem manual.
- **Trigger `apply_pagamento_to_reserva_v2` já roda em UPDATE de status:** o novo trigger de notificação **roda depois** (`AFTER UPDATE OF status` separado), sem conflito.

### Reservas (risco MÉDIO)
- **`criar_reserva_grupo` insere uma reserva + N passageiros em loop:** trigger em `reservas` emite 1× `booking.created` (correto). Cuidado para não criar trigger em `passageiros` também ou viram N notificações.
- **Cancelamento (`payment_status='cancelled'`):** já dispara `release_seat_on_cancel`. Adicionar `booking.cancelled` aqui em F3 — não em F0.

### Check-in (risco MÉDIO — **não entra em F0**)
- Fica no localStorage. Risco zero nesta fase.
- Quando entrar em F3: trigger em `checkins` (INSERT) é direto, mas `desembarcado` hoje é um UPDATE em `passageiros.embarcado_em=NULL` — precisará de trigger em `passageiros` com `WHEN (OLD.embarcado_em IS NOT NULL AND NEW.embarcado_em IS NULL)`. Mapear antes de F3.

### Convites (risco BAIXO — **não entra em F0**)
- `accept_staff_invitation` e `accept_socio_raiz_invitation` são RPCs próprias. Em F3, basta adicionar `PERFORM notify_emit(...)` no final delas — sem trigger.
- Convite *enviado* (INSERT em `invitations`) só notifica destino **após** o vínculo (não há `user_id` antes). Em F3, emitir no UPDATE `used=true` via trigger.

### Riscos transversais
- **Multi-tenant em `tenant_id`:** precisa ser preenchido na trigger lendo `excursoes.organizer_id`. Se trigger falhar em resolver, `tenant_id` fica null e badges multi-tenant futuros quebram. **Mitigação:** NOT NULL com fallback `coalesce` para `actor_id` quando aplicável.
- **Performance:** `notify_emit` pode inserir N linhas (raiz + sócios + staff). Para excursões com staff grande, ainda é `O(staff_da_excursao)` — aceitável (single tx). Indexar `notifications(recipient_id)` desde já.
- **Realtime indisponível em F0/F1:** UI dual não recebe push; depende de `staleTime`/refetch do React Query. Aceitável — não é regressão (sistema atual também não tem realtime).
- **Multi-papel:** mesma conta com `passageiro+excursionista` recebe notifs em buckets distintos (`recipient_role`). Garantir que `notify_resolve_recipients` use o **papel correto** por evento, não o papel "ativo" do usuário.

---

## 9. Estimativa por etapas

| Fase | Escopo | Tamanho |
|---|---|---|
| **F0** | 1 migration: tabelas + enums + GRANTs + RLS + 6 RPCs + 4 triggers (pagamento/reserva) + testes `read_query` validando linhas geradas. Zero código de app. | **1 sessão grande** (~1 turno de implementação + 1 de validação manual no banco) |
| **F1** | Reescrita de `emit.ts` (fachada dual com supressão por tipo coberto), reescrita de `useNotifications.ts` (modo dual sem realtime), criação de `v2.ts`. Sem mudar UI. Smoke test em preview interno com voluntário. | **1 sessão média** (~1–2 turnos) |
| **F2** | Flag `notifications_v2`, ativação de `useRealtimeSync` para `notifications`, botão "marcar como lida" individual no Panel, filtro por excursão. Habilitar publication realtime. Rollout para voluntários. | **1 sessão média** (~1–2 turnos) |
| **F3** | Triggers/RPCs para os 5 domínios restantes (checkin, embarque, convites, equipe/sócio, itens, excursao.updated). Cada domínio = 1 mini-PR independente: trigger + remoção da emissão local correspondente. | **3–5 sessões pequenas** (~1 turno cada, domínio por domínio) |
| **F4** | Migration de cleanup (`DROP TABLE notificacoes`), remoção de `store.ts`, simplificação de `emit.ts`, limpeza de `localStorage` no logout. | **1 sessão pequena** (~1 turno) |

**Total estimado:** 7–10 turnos de implementação distribuídos ao longo do tempo, com checkpoint de validação após cada fase. F0 e F1 ficam em preview interno (sob deploy controlado por envolverem pagamentos).

---

## Pontos abertos para sua decisão antes de F0

1. Confirmar que **dropar `public.notificacoes`** órfã é seguro (vazia/sem uso confirmado por audit — posso rodar `read_query` para reconfirmar antes da F0).
2. Confirmar a **lista de destinatários de `payment.submitted`**: apenas raiz, ou raiz + sócios + staff financeiro? (proposto: raiz + sócios; staff fora.)
3. Confirmar se trigger de pagamento deve emitir também para **`metodo='manual'`** (organizador lançou no nome do passageiro). Proposto: **sim**, com `data.fonte='manual'` para a UI ajustar o texto.

Aprovação dessas 3 + autorização explícita de F0 destrava a próxima sessão.
