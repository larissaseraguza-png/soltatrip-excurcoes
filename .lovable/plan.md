# Múltiplos ônibus por excursão

Hoje cada excursão funciona como se fosse 1 ônibus único. Vou introduzir uma entidade **Ônibus** filha da excursão, e fazer com que **poltronas, pontos de embarque, passageiros, staff e check-ins** sejam vinculados a um ônibus específico (não mais à excursão diretamente).

## 1. Banco de dados (migração)

Nova tabela `public.onibus`:
- `excursao_id` (FK lógica)
- `nome` (ex.: "Ônibus A — Manhã")
- `horario_saida`, `horario_retorno`
- `capacidade` (gera as poltronas automaticamente)
- `ordem` para ordenar visualmente
- `ativo`

Adicionar coluna `onibus_id` (nullable) em:
- `seats`
- `pontos_embarque`
- `passageiros`
- `equipe_excursoes` (staff fica restrito a 1 ônibus, conforme decisão anterior)
- `checkins`
- `pagamentos` (herda do passageiro, útil para relatório financeiro por ônibus)

Migração de dados existente (regra escolhida: **1 ônibus padrão por excursão**):
- Para cada excursão atual: criar um `onibus` "Ônibus 1" usando `total_vagas`, `horario_saida`, `horario_retorno` da excursão.
- Atualizar todas as linhas filhas (`seats`, `pontos_embarque`, `passageiros`, `equipe_excursoes`, `checkins`, `pagamentos`) com esse `onibus_id`.

Triggers / funções a ajustar:
- `ensure_seats_for_excursao` → passa a ser disparada **na criação de um ônibus**, gerando `capacidade` poltronas com `onibus_id` setado.
- `is_active_staff(excursao_id, user_id)` continua existindo; adiciono `is_active_staff_bus(onibus_id, user_id)` para RLS por ônibus.
- `organizer_create_manual_passageiro` e `organizer_update_passageiro_trip_choices` ganham parâmetro `p_onibus_id` e validam que `seat_id`/`ponto_embarque_id` pertencem àquele ônibus.
- `criar_reserva_grupo` recebe `p_onibus_id` e grava em cada passageiro.

RLS:
- Staff continua vendo a excursão, mas só vê `passageiros`, `seats`, `pontos_embarque`, `checkins`, `pagamentos` do **seu** `onibus_id`.
- Organizador continua com acesso total à excursão e a todos os ônibus.

## 2. Painel do excursionista

Dentro da página da excursão (`/app/excursao/$id`), adicionar seção **Ônibus**:
- Listar ônibus existentes com nome, horário, capacidade, ocupação (poltronas usadas / total), staff vinculado.
- Criar / editar / desativar ônibus.
- Tela de detalhe por ônibus reaproveitando as telas atuais (passageiros, poltronas, embarques, financeiro, check-in) — todas filtradas por `onibus_id`.
- Convite de staff passa a exigir escolha do ônibus.

Rotas novas:
- `/app/excursao/$id/onibus` (listagem/gestão)
- `/app/excursao/$id/onibus/$onibusId` (detalhe — abas: passageiros, poltronas, embarques, financeiro)

## 3. Fluxo de compra do passageiro

Na página pública da excursão (`/passageiro/excursao/$id` ou equivalente):
1. Escolhe a excursão (já existente)
2. **Novo passo**: escolhe o ônibus (cards com nome, horário e vagas restantes)
3. Escolhe ponto de embarque **daquele ônibus**
4. Escolhe poltrona **daquele ônibus**
5. Confirma reserva (grava `onibus_id` no passageiro)

## 4. Painel do staff

- Tela inicial do staff lista apenas o(s) ônibus em que ele está vinculado.
- Check-in (`/staff/checkin`) e listas de passageiros filtram por `onibus_id` automaticamente.
- QR code do passageiro já é único; ao escanear, valida que o passageiro pertence ao ônibus do staff (senão erro "passageiro de outro ônibus").

## 5. UI / cuidados visuais

- Em todos os lugares onde aparece "Excursão X", incluir o nome do ônibus quando o contexto for por ônibus (ex.: "Festival XYZ · Ônibus A — Manhã").
- Manter compatibilidade: dashboards de resumo continuam mostrando totais consolidados da excursão, com breakdown por ônibus.

## Ordem de implementação

1. Migração SQL (tabela `onibus`, colunas `onibus_id`, dados existentes, RLS, funções).
2. Tipos atualizados (auto-gerados após migração).
3. Painel do excursionista: CRUD de ônibus + filtros nas telas existentes.
4. Fluxo de compra do passageiro (seleção de ônibus).
5. Painel do staff (filtro por ônibus + check-in validando ônibus).

Esta primeira mensagem cobre o **passo 1 (migração)**. Depois que você aprovar a migração, sigo direto com os passos 2–5 em código.

## Detalhes técnicos

- `onibus_id` começa **nullable** para permitir a migração de dados; após o backfill, vira `NOT NULL` em `seats`, `passageiros` (apenas onde já há excursão), `pontos_embarque`, `checkins`.
- `equipe_excursoes.onibus_id` permanece nullable: convites por e-mail entram sem ônibus definido e o organizador escolhe depois.
- Índices: `(excursao_id, onibus_id)` em `passageiros`, `seats`, `pontos_embarque`, `checkins`, `pagamentos`.
- `seats` ganha unique `(onibus_id, seat_number)` substituindo `(excursao_id, seat_number)`.
- Trigger `ensure_seats_for_excursao` é desativado/substituído por um equivalente em `onibus` (gera poltronas no insert do ônibus).
