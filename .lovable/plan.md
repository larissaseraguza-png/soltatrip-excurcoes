## B-08 — Painel Operacional do Excursionista

Substituir a aba **"Reservas"** dentro do sino do excursionista por um **novo botão "Operacional"** ao lado do sino, focado em **tarefas pendentes que exigem ação**, derivadas em tempo real do banco (não de notificações).

### Escopo (apenas excursionista)
- Não mexer em pagamentos, financeiro, combos, ou estrutura geral de notificações.
- Não alterar o sino de passageiro/staff.

### Mudanças

**1. Sino do excursionista (`NotificationPanel.tsx`)**
- Remover a aba `reservas` da lista `FILTERS_BY_ROLE.excursionista`.
- Notificações da categoria `reservas` deixam de aparecer no painel (continuam no banco, sem efeito).

**2. Novo componente `OperacionalBell.tsx`**
- Botão estilo `outline` (mesmo visual do sino), ícone `ClipboardList`.
- Mostra contador = **número de categorias com ≥1 pendência** (não soma de itens).
- Ao clicar abre um `Sheet` lateral igual ao painel de notificações.

**3. Novo hook `useOperacional.ts`**
Query única (`["operacional", userId]`, `staleTime: 30s`) que retorna grupos:

| Categoria | Fonte / regra |
|---|---|
| Convites pendentes de envio | `invitations` com `used=false` e `expires_at > now()` criados pelo usuário |
| Passageiros sem poltrona | `passageiros.seat_id IS NULL` em excursões do organizador (e `payment_status='paid'`) |
| Passageiros sem embarque | `passageiros.ponto_embarque_id IS NULL` em excursões do organizador (e `payment_status='paid'`) |
| Combos aguardando envio | `pedidos_itens.status='pendente'` em excursões do organizador |

Filtrado por excursões do organizador (`excursoes.organizer_id = auth.uid()`) — escopo multi-tenant respeitando RLS já existente.

Realtime via `useRealtimeSync` nas tabelas `passageiros`, `invitations`, `pedidos_itens` para reduzir staleness sem polling agressivo.

**4. Painel do Operacional**
Lista plana de categorias:
```
📨 5 convites pendentes        →
🪑 2 passageiros sem poltrona  →
🚏 1 passageiro sem embarque   →
🎁 3 combos aguardando envio   →
```
- Cada linha clicável navega para a rota apropriada (ex: `/app/passageiros?filter=sem-poltrona`, `/app/excursao/$id/itens`, etc — usando rotas existentes; sem mexer em backend).
- Contador no botão = `grupos.filter(g => g.count > 0).length`.
- Resolver uma pendência reduz `count` daquele grupo ao próximo refetch; o item só some quando `count = 0`.

**5. Integração no header (`RoleHeader.tsx`)**
- Inserir `<OperacionalBell />` ao lado de `<NotificationBell role="excursionista" />`, apenas para `role === "excursionista"`.

### Arquivos a criar/editar
- `src/hooks/useOperacional.ts` (novo)
- `src/components/OperacionalBell.tsx` (novo)
- `src/components/NotificationPanel.tsx` (remover aba reservas)
- `src/components/RoleHeader.tsx` (adicionar botão)

### Fora de escopo
- Não criar tabela nem migração — usa queries derivadas das tabelas existentes.
- Não alterar geração de notificações no backend.
- Lógica de "resolver" é implícita (a pendência some quando o dado fonte muda).