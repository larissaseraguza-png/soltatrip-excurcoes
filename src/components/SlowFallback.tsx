import { Link } from "@tanstack/react-router";
import { AlertCircle, Loader2 } from "lucide-react";

/**
 * Tela de fallback exibida quando o carregamento (auth, convite, dados)
 * demora muito em redes móveis instáveis ou dispositivos externos.
 * Garante que o usuário sempre tenha uma saída — voltar à landing ou
 * fazer login manualmente — em vez de ficar preso em spinner infinito.
 */
export function SlowFallback({
  onRetry,
  message = "Carregamento está demorando mais que o normal.",
}: {
  onRetry?: () => void;
  message?: string;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="relative glass rounded-3xl p-7 max-w-md w-full text-center">
        <div className="size-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 grid place-items-center mx-auto mb-4">
          <AlertCircle className="size-6 text-yellow-400" />
        </div>
        <h1 className="font-display text-xl font-bold mb-2">Conexão lenta</h1>
        <p className="text-sm text-muted-foreground mb-5">{message}</p>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Tentando carregar…</span>
        </div>
        <div className="flex flex-col gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold glow-primary hover:opacity-90"
            >
              Tentar novamente
            </button>
          )}
          <Link
            to="/auth"
            className="w-full h-11 rounded-xl border border-border bg-card font-semibold flex items-center justify-center hover:bg-secondary"
          >
            Fazer login manual
          </Link>
          <Link
            to="/"
            className="w-full h-11 rounded-xl font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center"
          >
            Voltar à página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}
