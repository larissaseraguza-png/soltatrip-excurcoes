REVOKE ALL ON FUNCTION public.organizer_update_passageiro_trip_choices(uuid, uuid, boolean, uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.organizer_update_passageiro_trip_choices(uuid, uuid, boolean, uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.organizer_update_passageiro_trip_choices(uuid, uuid, boolean, uuid, boolean) TO authenticated;