import React from "react";
import { AlertCircle } from "lucide-react";

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
  }

  reset = () => this.setState({ hasError: false, message: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="glass rounded-2xl p-4 border border-destructive/30 text-xs">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Não foi possível carregar este bloco</p>
            <p className="text-muted-foreground mt-0.5">
              {this.props.label ? `${this.props.label}. ` : ""}O restante da página continua funcionando.
            </p>
            <button
              onClick={this.reset}
              className="mt-2 text-[11px] font-semibold text-primary underline"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }
}
