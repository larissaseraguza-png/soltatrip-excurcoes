import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ClipboardList,
  Mail,
  Armchair,
  MapPin,
  Gift,
  Ticket,
  Tent,
  Package,
  Coffee,
  ChevronRight,
  ChevronLeft,
  Copy,
  Share2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  useOperacional,
  type OperacionalGroupKey,
  type OperacionalGroup,
  type OperacionalItem,
} from "@/hooks/useOperacional";
import { toast } from "sonner";

const ICONS: Record<OperacionalGroupKey, React.ComponentType<{ className?: string }>> = {
  convites: Mail,
  sem_poltrona: Armchair,
  sem_embarque: MapPin,
  combos: Gift,
  ingressos: Ticket,
  camping: Tent,
  copos: Coffee,
  outros: Package,
};

const TONES: Record<OperacionalGroupKey, string> = {
  convites: "bg-neon-purple/15 text-neon-purple",
  sem_poltrona: "bg-amber-500/15 text-amber-400",
  sem_embarque: "bg-blue-500/15 text-blue-400",
  combos: "bg-neon-pink/15 text-neon-pink",
  ingressos: "bg-neon-green/15 text-neon-green",
  camping: "bg-emerald-500/15 text-emerald-400",
  copos: "bg-orange-500/15 text-orange-400",
  outros: "bg-muted text-muted-foreground",
};

function inviteLink(papel: string | undefined, token: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  if (papel === "socio_raiz") return `${base}/invite/excursionista/${token}`;
  // staff e variantes
  return `${base}/invite/staff/${token}`;
}

export function OperacionalBell() {
  const [open, setOpen] = useState(false);
  const [openKey, setOpenKey] = useState<OperacionalGroupKey | null>(null);
  const navigate = useNavigate();
  const { groups, pendingCategories } = useOperacional();
  const display = pendingCategories > 99 ? "99+" : String(pendingCategories);

  const visibles = groups.filter((g) => g.count > 0);
  const current = openKey ? groups.find((g) => g.key === openKey) ?? null : null;

  async function handleConviteAction(item: OperacionalItem) {
    if (!item.token) return;
    const link = inviteLink(item.papel, item.token);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Convite SoltaTrip", url: link });
        return;
      }
    } catch {
      /* user cancelled share */
    }
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link do convite copiado");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  }

  function handleItemClick(group: OperacionalGroup, item: OperacionalItem) {
    if (group.key === "convites") {
      void handleConviteAction(item);
      return;
    }
    if (item.to) {
      setOpen(false);
      setOpenKey(null);
      navigate({ to: item.to as never }).catch(() => {});
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setOpenKey(null);
      }}
    >
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
            {current ? (
              <button
                type="button"
                onClick={() => setOpenKey(null)}
                className="inline-flex items-center justify-center size-7 -ml-1 rounded-md hover:bg-muted/60"
                aria-label="Voltar"
              >
                <ChevronLeft className="size-4" />
              </button>
            ) : (
              <ClipboardList className="size-5 text-primary" />
            )}
            {current ? capitalize(current.label) : "Operacional"}
          </SheetTitle>
          {!current && (
            <p className="text-xs text-muted-foreground mt-1">
              Pendências que exigem sua ação.
            </p>
          )}
        </SheetHeader>

        <div className="flex flex-col overflow-y-auto flex-1">
          {!current && visibles.length === 0 && (
            <div className="px-5 py-12 text-center">
              <ClipboardList className="size-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma pendência. Tudo em dia!
              </p>
            </div>
          )}

          {!current &&
            visibles.map((g) => {
              const Icon = ICONS[g.key];
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setOpenKey(g.key)}
                  className="w-full text-left flex items-center gap-3 px-5 py-4 border-b border-border/40 hover:bg-muted/40 active:bg-muted/60 transition"
                >
                  <div
                    className={`size-9 grid place-items-center rounded-full shrink-0 ${TONES[g.key]}`}
                  >
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
            })}

          {current && current.items.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              Nenhum item nesta categoria.
            </div>
          )}

          {current &&
            current.items.map((item) => {
              const isConvite = current.key === "convites";
              const ActionIcon = isConvite
                ? typeof navigator !== "undefined" && (navigator as Navigator & { share?: unknown }).share
                  ? Share2
                  : Copy
                : ChevronRight;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(current, item)}
                  className="w-full text-left flex items-center gap-3 px-5 py-3.5 border-b border-border/40 hover:bg-muted/40 active:bg-muted/60 transition"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug truncate">
                      {item.titulo}
                    </p>
                    {item.subtitulo && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {item.subtitulo}
                      </p>
                    )}
                  </div>
                  <ActionIcon className="size-4 text-muted-foreground/60 shrink-0" />
                </button>
              );
            })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
