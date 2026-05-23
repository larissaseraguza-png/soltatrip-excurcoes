REVOKE EXECUTE ON FUNCTION public.is_reserva_comprador(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_reserva_passageiro(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_reserva_comprador(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_reserva_passageiro(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';