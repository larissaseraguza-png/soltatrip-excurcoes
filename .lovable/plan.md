
# Auditoria de segurança — pré-produção

Levantei o estado atual com o scanner de segurança, o linter do banco e a árvore de rotas. Abaixo está o plano de correção, agrupado por criticidade. Só sigo após sua aprovação porque alguns itens têm impacto operacional (ex.: exigir verificação de e-mail bloqueia logins de contas já criadas sem confirmar).

## 1. Crítico — corrigir antes de produção

**1.1 Race condition de venda de ingressos (`passageiro.itens.$id.tsx`)**
Hoje o cliente lê `quantidade_vendida`, soma e grava de volta. Dois compradores simultâneos podem sobrevender. Além disso, `qtd` não é validado no servidor.
- Criar RPC `comprar_item(p_item_id, p_qtd, p_passageiro_id)` com `SECURITY DEFINER` que:
  - valida `qtd` entre 1 e 10,
  - faz `UPDATE excursao_itens SET quantidade_vendida = quantidade_vendida + p_qtd WHERE id = ... AND (quantidade_total IS NULL OR quantidade_vendida + p_qtd <= quantidade_total)` atomicamente,
  - insere `pedidos_itens`,
  - exige `auth.uid()` e valida vínculo do comprador.
- Remover o `update` direto de `excursao_itens` do cliente.
- Revogar `UPDATE` em `excursao_itens` para `authenticated` (manter só para o organizador via RLS atual).

**1.2 Verificação de e-mail obrigatória**
Ativar `auto_confirm_email: false` no Supabase Auth (já é o padrão em projetos novos, mas confirmar). No frontend de `auth.tsx`:
- Após `signUp`, se `data.session` for `null`, mostrar tela "Confirme seu e-mail" em vez de tentar login automático.
- No login, tratar erro `email_not_confirmed` com mensagem clara e botão "Reenviar confirmação".

**1.3 Proteção contra senhas vazadas (HIBP)**
Ativar `password_hibp_enabled: true`.

## 2. Alto — isolamento multi-tenant e proteção de rotas

**2.1 Guard global de rotas autenticadas**
Hoje cada rota usa `<RoleGuard allow="...">` no componente, o que causa flash de conteúdo. Migrar para o padrão TanStack `_authenticated` layout com `beforeLoad` que:
- valida sessão via `supabase.auth.getUser()`,
- redireciona para `/auth` salvando `redirect` em search params,
- valida o papel (excursionista/staff/passageiro) e redireciona para o home correto se diferente.

Estrutura: manter as rotas atuais, mas adicionar `beforeLoad` no shell de cada perfil (`passageiro.tsx`, `excursionista.tsx`, `staff.tsx`).

**2.2 Reforço do isolamento por excursionista**
A tabela `passageiro_excursionistas` + a policy `Passengers view linked published excursoes` já filtram. Falta:
- Garantir que `Passengers view booked excursoes` não vaze `excursoes` de outros organizadores quando o passageiro tem reserva antiga — manter, pois é a regra explícita ("acesso direto = só vê o que já reservou"). Documentar isso em comentário SQL.
- Adicionar RLS em `profiles` para que o passageiro veja apenas profiles de organizadores aos quais está vinculado (hoje a policy é `auth.uid() = id`, o que é correto e fechado — confirmar que nenhum SELECT cliente busca `profiles` de outro user; auditar e mover esses lookups para a RPC `get_excursionista_vitrine` que já existe).

**2.3 Revogar EXECUTE público em funções `SECURITY DEFINER`**
38 funções estão expostas para `anon`/`authenticated`. Triagem:
- Manter EXECUTE para `anon`: `get_excursionista_vitrine`, `get_excursionista_excursoes_publicas`, `get_passageiro_invite`, `get_staff_invitation` (necessárias para landing pública e convites).
- Manter EXECUTE para `authenticated`: `complete_signup_profile`, `claim_passageiro_invite`, `accept_staff_invitation`, `criar_reserva_grupo`, `organizer_*`, `comprar_item` (novo), `get_excursao_payment_info`, `list_my_staff_onibus`, `get_my_role`, `has_role`, `has_booking_for_excursao`, `is_linked_to_excursionista`, `is_active_staff*`, `is_reserva_*`.
- Revogar EXECUTE de funções de trigger interno: `touch_updated_at`, `handle_new_user`, `link_pending_staff_invites`, `lock_seat_changes`, `lock_passageiro_choices`, `release_seat_on_cancel`, `sync_passageiro_on_pagamento`, `apply_pagamento_to_reserva*`, `set_pagamento_onibus`, `ensure_seats_for_onibus`, `recalc_passageiro_payments`.

## 3. Médio — endurecimento

**3.1 Limpar fluxo de auto-confirm e signup**
Em `auth.tsx`, remover o `signInWithPassword` automático pós-signup (linha que faz auto-login). Mostrar estado "verifique seu e-mail" + reenvio.

**3.2 Validação de input em RPCs**
Adicionar checks em `criar_reserva_grupo` (já valida `1..20`) e novo `comprar_item` (`1..10`, total > 0).

**3.3 Logs e PII**
Auditar `console.log` que imprimam token, email, telefone — remover.

## 4. Itens já corretos (sem ação)

- RLS habilitada em todas as tabelas de domínio.
- Service role key só em `client.server.ts` (não importado pelo client).
- `attachSupabaseAuth` registrado em `start.ts`.
- `requireSupabaseAuth` está disponível mas hoje não há nenhum `createServerFn` que dependa dele — todo acesso a dados passa pelo cliente Supabase + RLS, o que é aceitável neste app. Não migrar tudo para serverFn agora; manter `requireSupabaseAuth` como padrão para qualquer serverFn futura.

## Sobre o aviso "SERVER_FN_MISSING_AUTH"

O scanner sugere adicionar `requireSupabaseAuth` ao `functionMiddleware` global. **Não vou aplicar** porque (a) algumas serverFn futuras serão públicas (ex.: vitrine), (b) o padrão TanStack é opt-in por função, e (c) hoje o app não tem nenhuma serverFn — todo o acesso é via Supabase client + RLS. Vou documentar isto no `mem://` do projeto para evitar regressão.

## Entregáveis

- 1 migração SQL: nova RPC `comprar_item`, REVOKE EXECUTE em triggers internos, REVOKE seletivo nas DEFINER funções públicas.
- Configuração Auth: `auto_confirm_email=false`, `password_hibp_enabled=true`.
- Edits:
  - `src/routes/passageiro.itens.$id.tsx` — usar `rpc('comprar_item', ...)`.
  - `src/routes/auth.tsx` — fluxo "confirme seu e-mail".
  - `src/routes/passageiro.tsx`, `excursionista.tsx`, `staff.tsx` — `beforeLoad` com checagem de sessão + papel (substitui RoleGuard no shell).
- `mem://index.md` com a decisão sobre middleware global.

## Risco operacional

Após habilitar verificação de e-mail obrigatória, **usuários já cadastrados sem e-mail confirmado não conseguirão logar** até clicar no link de confirmação. Confirme se posso aplicar.

---

Quer que eu siga com tudo, ou prefere recortar algum item (ex.: adiar a obrigatoriedade de verificação de e-mail)?
