import { supabase } from "@/integrations/supabase/client";

const KEY = "pending_excursionista_link";

export function rememberExcursionistaInvite(orgId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, orgId);
}

export function getPendingExcursionistaInvite(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function clearPendingExcursionistaInvite() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

/** Cria o vínculo passageiro -> excursionista (idempotente). */
export async function linkPassageiroToExcursionista(orgId: string) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid || !orgId) return;
  await supabase
    .from("passageiro_excursionistas")
    .upsert(
      { passageiro_user_id: uid, excursionista_id: orgId },
      { onConflict: "passageiro_user_id,excursionista_id", ignoreDuplicates: true },
    );
}

/** Consome o convite pendente, se houver, criando o vínculo. */
export async function consumePendingExcursionistaInvite() {
  const orgId = getPendingExcursionistaInvite();
  if (!orgId) return;
  await linkPassageiroToExcursionista(orgId);
  clearPendingExcursionistaInvite();
}
