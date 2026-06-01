-- Limpeza de dados de teste — preserva estrutura. Desabilita triggers de usuário só nesta transação.
SET LOCAL session_replication_role = 'replica';

DELETE FROM public.checkins;
DELETE FROM public.pagamentos;
DELETE FROM public.pedidos_itens;

UPDATE public.seats
SET occupied = false,
    reserved_by = NULL,
    passageiro_id = NULL,
    updated_at = now()
WHERE occupied = true OR reserved_by IS NOT NULL OR passageiro_id IS NOT NULL;

DELETE FROM public.passageiros;
DELETE FROM public.reservas;

UPDATE public.excursao_itens
SET quantidade_vendida = 0,
    updated_at = now()
WHERE quantidade_vendida > 0;

DELETE FROM public.notifications
WHERE pagamento_id IS NOT NULL
   OR passageiro_id IS NOT NULL
   OR reserva_id IS NOT NULL;

DELETE FROM public.notificacoes
WHERE excursao_id IS NOT NULL;

SET LOCAL session_replication_role = 'origin';