# Multi-tenant por link de excursionista

## Visão geral

Cada excursionista terá um link único `/invite/excursionista/{organizer_id}`. Ao abrir, o passageiro entra na "vitrine" daquele organizador: cadastro/login vincula a conta e, a partir daí, **todas** as listagens de excursões publicadas no painel do passageiro são filtradas pelos organizadores aos quais ele está vinculado. Sem link, o passageiro só vê excursões que já reservou.

## Banco de dados

Nova tabela `passageiro_excursionistas`:
- `passageiro_user_id` (uuid → auth.users)
- `excursionista_id` (uuid → auth.users, o organizer_id)
- `created_at`
- UNIQUE(passageiro_user_id, excursionista_id)

RLS:
- passageiro vê/insere apenas suas próprias linhas
- excursionista vê suas próprias linhas (lista de "seus passageiros")

Função `is_linked_to_excursionista(_pax uuid, _org uuid)` SECURITY DEFINER.

Substituir policy `Passengers view published excursoes` em `excursoes`:
```
(status='publicada' AND has_role(auth.uid(),'passageiro')
 AND is_linked_to_excursionista(auth.uid(), organizer_id))
```
Mantém policy `Passengers view booked excursoes` para acesso direto sem link.

## Rotas

**Nova: `src/routes/invite.excursionista.$id.tsx`**
- Pega `id` (organizer_id), valida que existe e tem role excursionista
- Mostra "vitrine" pública: nome do organizador + excursões publicadas dele
- Botão "Entrar/Cadastrar" → salva `pending_excursionista_link` em localStorage e vai pra `/auth`
- Se já logado como passageiro: faz upsert em `passageiro_excursionistas` e redireciona pra `/passageiro`

**`src/routes/auth.tsx`**
- Após signup/login de passageiro, ler `pending_excursionista_link` e fazer upsert antes do redirect

**`src/routes/passageiro.index.tsx`**
- Query de excursões já roda com RLS → filtragem automática
- Adicionar estado "vazio": "Você ainda não tem nenhum organizador vinculado. Peça o link de convite ao seu organizador."

## Mudanças mínimas em UI existente

- `passageiro.tsx` shell: mostrar badge/header do organizador ativo quando há apenas um vinculado
- Não mexer no fluxo de combo/reserva (já funciona via RLS)

## Tarefas

1. Migration: tabela + função + atualização da policy de `excursoes`
2. Helper `link-excursionista.ts` (localStorage + upsert)
3. Rota `/invite/excursionista/$id` (vitrine pública + auto-link)
4. Integrar auto-link no `auth.tsx`
5. Estado vazio no `passageiro.index.tsx`
