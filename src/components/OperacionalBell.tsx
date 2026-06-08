import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ClipboardList,
  Mail,
  Armchair,
  MapPin,
  Gift,
  ChevronRight,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useOperacional, type OperacionalGroupKey } from "@/hooks/useOperacional";

const ICONS: Record<OperacionalGroupKey, React.ComponentType<{ className?: string }>> = {
  convites: Mail,
  sem_poltrona: Armchair,
  sem_embarque: MapPin,
  combos: Gift,
};

const TONES: Record<OperacionalGroupKey, string> = {
  convites: "bg-neon-purple/15 text-neon-purple",
  sem_poltrona: "bg-amber-500/15 text-amber-400",
  sem_embarque: "bg-blue-500/15 text-blue-400",
  combos: "bg-neon-pink/15 text-neon-pink",
};

export function OperacionalBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { groups, pendingCategories } = useOperacional();
  const display = pendingCategories > 99 ? "99+" : String(pendingCategories);

  const visibles = groups.filter((g) => g.count > 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Operacional"
          className="relative inline-flex items-center justify-center rounded-lg border border-border bg-card px-3 py-1.5 hover:bg-secondary transition"
        >
          <ClipboardList className="h-4 w-4 text-foreground" />
          {pendingCategories > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold rounded-full bg-neon-pink text-white border-2 border-background">
              {display}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <SheetTitle className="flex items-center gap-2 text-base pr-16">
            <ClipboardList className="size-5 text-primary" />
            Operacional
          </SheetTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Pendências que exigem sua ação.
          </p>
        </SheetHeader>

        <div className="flex flex-col overflow-y-auto flex-1">
          {visibles.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <ClipboardList className="size-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma pendência. Tudo em dia!
              </p>
            </div>
          ) : (
            visibles.map((g) => {
              const Icon = ICONS[g.key];
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate({ to: g.to as never }).catch(() => {});
                  }}
                  className="w-full text-left flex items-center gap-3 px-5 py-4 border-b border-border/40 hover:bg-muted/40 active:bg-muted/60 transition"
                >
                  <div className={`size-9 grid place-items-center rounded-full shrink-0 ${TONES[g.key]}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">
                      {g.count} {g.label}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/60 shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
