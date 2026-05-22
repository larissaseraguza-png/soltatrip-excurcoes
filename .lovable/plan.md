## Objetivo

Centralizar todas as excursões no banco de dados único (tabela `excursoes` já existente no Supabase) e remover dados mockados. Garantir que:

- **Passageiro** vê apenas excursões reais (publicadas) criadas por excursionistas.
- **Excursionista** lista/cria suas próprias excursões (já parcialmente funcional).
- **Staff** pode ser vinculado a excursões via nova tabela `equipe_excursoes`, com suporte a convites por e-mail antes do staff ter conta criada.

---

## 1. Banco de dados (migração)

Criar nova tabela e ajustar policies:

```text
equipe_excursoes
├── id (uuid pk)
├── excursao_id (uuid → excursoes.id)
├── staff_user_id (uuid, nullable) ← preenchido quando staff aceita
├── convite_email (text, nullable)  ← usado antes do cadastro
├── papel (text, default 'staff')   ← 'staff' | 'lider'
├── status (text, default 'pendente') ← 'pendente' | 'ativo' | 'recusado'
├── created_at, updated_at
└── UNIQUE (excursao_id, staff_user_id)
```

**RLS:**
- Excursionista (dono da excursão) → CRUD completo nos vínculos da sua excursão.
- Staff autenticado → SELECT/UPDATE apenas dos vínculos onde `staff_user_id = auth.uid()` OU `convite_email = email do user`.
- Trigger: ao criar conta de staff, função `link_pending_staff_invites()` faz match por e-mail e preenche `staff_user_id` + status `ativo`.

**Policies adicionais em `excursoes`:**
- SELECT pública para excursões com `status = 'publicada'` (passageiro vê tudo que está publicado).
- SELECT para staff vinculado (via `equipe_excursoes`).

**Policies em `passageiros`:**
- Permitir passageiro autenticado se inscrever em excursões publicadas.
- Passageiro vê apenas seus próprios registros (via `passageiros.user_id` — adicionar coluna).

---

## 2. Frontend

### Excursionista (`/excursionista`, `/app`)
- Substituir array `trips` mockado em `src/routes/excursionista.index.tsx` e `src/routes/app.index.tsx` por query Supabase: `excursoes.select().eq('organizer_id', user.id)`.
- Tela "Nova excursão" já existe (`app.excursao.nova.tsx`) — verificar que persiste corretamente.
- Adicionar aba "Equipe" na excursão: lista staff vinculado + botão "Convidar staff por e-mail" (insere em `equipe_excursoes` com `convite_email`).

### Staff (`/staff`)
- Tela inicial passa a listar excursões onde o staff está vinculado (`equipe_excursoes` join `excursoes`).
- Mostrar convites pendentes (status `pendente` com match no e-mail) com botões aceitar/recusar.

### Passageiro (`/passageiro`)
- Substituir `viagens` mockado em `src/routes/passageiro.index.tsx` por:
  - **"Disponíveis"**: `excursoes.select().eq('status', 'publicada')` — todas as excursões reais publicadas.
  - **"Minhas viagens"**: `passageiros.select(*, excursao:excursoes(*)).eq('user_id', auth.uid())`.
- Botão "Reservar" cria registro em `passageiros` vinculando user_id + excursao_id.

---

## 3. Detalhes técnicos

- Adicionar coluna `passageiros.user_id uuid` (nullable para compatibilidade com cadastros manuais feitos pelo excursionista).
- Atualizar `Database` types automaticamente após migração (Lovable regenera).
- Manter UI/estilo neon atual; apenas trocar fonte de dados.
- Não tocar em `src/integrations/supabase/*` (auto-gerados).

---

## Arquivos afetados

- **Nova migração SQL** (tabela `equipe_excursoes`, policies, trigger, coluna `passageiros.user_id`).
- `src/routes/excursionista.index.tsx` — fetch real.
- `src/routes/app.index.tsx` — fetch real.
- `src/routes/passageiro.index.tsx` — fetch real + abas Disponíveis/Minhas.
- `src/routes/staff.index.tsx` — fetch real + convites pendentes.
- Nova tela/aba: `src/routes/excursionista.equipe.tsx` (gerenciar staff por excursão).

---

## Ordem de execução

1. Rodar migração SQL (aguardar aprovação do usuário).
2. Atualizar páginas de listagem (excursionista, passageiro, staff) para usar Supabase.
3. Adicionar fluxo de convite/aceite de staff.
4. Testar com as 3 contas via preview.
