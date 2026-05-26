import { supabase } from "@/integrations/supabase/client";

/**
 * Logout completo + limpeza de cache de autenticação local.
 *
 * - Encerra sessão no Supabase (remove tokens persistidos).
 * - Limpa marcadores de sessão/convites pendentes.
 * - Se "Lembrar de mim" estiver desativado, também limpa o identificador
 *   salvo (e-mail/telefone) para que a tela de login volte totalmente limpa.
 */
export async function signOutAndClean() {
  try {
    await supabase.auth.signOut();
  } catch {
    /* ignora — vamos limpar o estado local de qualquer forma */
  }

  try {
    sessionStorage.removeItem("st_session_alive");
    localStorage.removeItem("pending_staff_invite");
    localStorage.removeItem("pending_pax_invite");

    const remember = localStorage.getItem("st_remember");
    if (remember === "0") {
      localStorage.removeItem("st_last_identifier");
      localStorage.removeItem("st_last_email");
    }
  } catch {
    /* storage indisponível */
  }
}
