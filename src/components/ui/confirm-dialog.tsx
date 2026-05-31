import { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

export type ConfirmOptions = {
  title?: string;
  message: string;
  details?: Array<{ label: string; value: string }>;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type Resolver = (ok: boolean) => void;

const ConfirmCtx = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(
  null,
);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<Resolver | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const finish = (ok: boolean) => {
    setOpen(false);
    const r = resolverRef.current;
    resolverRef.current = null;
    if (r) r(ok);
  };

  const destructive = opts?.destructive ?? true;

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(o) => {
          if (!o) finish(false);
        }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              {destructive && (
                <div className="size-9 rounded-full bg-destructive/15 text-destructive grid place-items-center shrink-0">
                  <AlertTriangle className="size-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <AlertDialogTitle className="text-base">
                  {opts?.title ?? "Confirmar ação"}
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-1 text-sm text-muted-foreground">
                  {opts?.message}
                </AlertDialogDescription>
              </div>
            </div>
            {opts?.details && opts.details.length > 0 && (
              <div className="mt-3 rounded-lg border border-border/60 bg-muted/40 p-3 space-y-1.5">
                {opts.details.map((d) => (
                  <div
                    key={d.label}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="text-muted-foreground">{d.label}</span>
                    <span className="font-medium text-foreground text-right truncate">
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => finish(false)}>
              {opts?.cancelLabel ?? "Cancelar"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => finish(true)}
              className={
                destructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {opts?.confirmLabel ?? "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmCtx.Provider>
  );
}

/**
 * Hook para abrir um modal de confirmação profissional do app.
 * Retorna Promise<boolean>. Substitui `window.confirm`.
 *
 * Ex.:
 *   const confirm = useConfirm();
 *   if (!(await confirm({ message: "Remover Vítor do embarque?" }))) return;
 */
export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) {
    throw new Error("useConfirm precisa de <ConfirmProvider> na árvore");
  }
  return ctx;
}
