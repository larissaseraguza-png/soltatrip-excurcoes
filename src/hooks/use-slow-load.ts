import { useEffect, useState } from "react";

/**
 * Retorna `true` se o estado de loading continuar verdadeiro por mais
 * que `delay` ms. Usado para mostrar uma tela de fallback (com botões
 * de voltar / login) quando o carregamento trava em dispositivos
 * externos, redes móveis instáveis ou sessões expiradas.
 */
export function useSlowLoad(loading: boolean, delay = 4000): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!loading) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), delay);
    return () => clearTimeout(t);
  }, [loading, delay]);
  return slow;
}
