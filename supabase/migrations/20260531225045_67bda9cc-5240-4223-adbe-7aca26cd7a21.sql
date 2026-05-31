DROP TRIGGER IF EXISTS trg_apply_pagamento ON public.pagamentos;
DROP TRIGGER IF EXISTS pagamentos_apply_v2 ON public.pagamentos;
DROP TRIGGER IF EXISTS trg_sync_passageiro_on_pagamento ON public.pagamentos;

DROP FUNCTION IF EXISTS public.apply_pagamento_to_reserva();
DROP FUNCTION IF EXISTS public.apply_pagamento_to_reserva_v2();
DROP FUNCTION IF EXISTS public.sync_passageiro_on_pagamento();
DROP FUNCTION IF EXISTS public.recalc_passageiro_payments(uuid);