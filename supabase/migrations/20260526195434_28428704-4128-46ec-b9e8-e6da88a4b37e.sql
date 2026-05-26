
-- Revoke EXECUTE from anon/authenticated on internal trigger-only SECURITY DEFINER functions.
-- These are invoked only by Postgres triggers, never by client code, so they should not be
-- callable via the public Data API. Application-facing RPCs are intentionally left untouched.

REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.link_pending_staff_invites() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lock_seat_changes() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lock_passageiro_choices() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_seat_on_cancel() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_passageiro_on_pagamento() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_pagamento_to_reserva() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_pagamento_to_reserva_v2() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_pagamento_onibus() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_seats_for_onibus() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalc_passageiro_payments(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_profile_slug() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guard_passageiro_sensitive_fields() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guard_reserva_sensitive_fields() FROM anon, authenticated, PUBLIC;
