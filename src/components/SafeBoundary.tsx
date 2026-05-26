import React from "react";
import { AlertCircle } from "lucide-react";
import { isChunkError, forceFreshReload } from "@/lib/chunk-reload";

type Props = { children: React.ReactNode; label?: string; fallback?: React.ReactNode };
type State = { hasError: boolean; message?: string };

export class SafeBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: (error as Error)?.message ?? "Erro inesperado" };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.warn("[SafeBoundary]", this.props.label ?? "", error);
    if (isChunkError(error)) forceFreshReload();
  }

  reset = () => this.setState({ hasError: false, message: undefined });
  reload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    const msg = this.state.message ?? "";
    return (
      <div className="glass rounded-2xl p-4 border border-destructive/30 text-xs">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Não foi possível carregar este bloco</p>
            <p className="text-muted-foreground mt-0.5">
              {this.props.label ? `${this.props.label}. ` : ""}Tente recarregar a página.
            </p>
            {msg && (
              <p className="mt-1 text-[10px] text-muted-foreground/70 break-words font-mono">
                {msg.slice(0, 240)}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-3">
              <button
                onClick={this.reload}
                className="text-[11px] font-semibold text-primary underline"
              >
                Recarregar página
              </button>
              <button
                onClick={this.reset}
                className="text-[11px] font-semibold text-muted-foreground underline"
              >
                Tentar de novo
              </button>
              <a
                href="/"
                className="text-[11px] font-semibold text-muted-foreground underline"
              >
                Voltar ao início
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
