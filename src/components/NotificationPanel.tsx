import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CheckCircle,
  UserPlus,
  CreditCard,
  Clock,
  Ticket,
  QrCode,
  Bus,
  Calendar,
  LogOut,
  Edit3,
  Shield,
  Users,
  Trash2,
  ChevronRight,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useNotifications } from "@/hooks/useNotifications";
import { formatRelative, type NotifIconKey, type NotifRole, type NotifTone, type NotifCategory } from "@/lib/notifications/store";
import { resolveNotificationRoute } from "@/lib/notifications/resolveRoute";

const FILTERS_BY_ROLE: Record<NotifRole, { key: NotifCategory; label: string }[]> = {
  excursionista: [
    { key: "pagamentos", label: "Pagamentos" },
    { key: "reservas", label: "Reservas" },
    { key: "checkin", label: "Check-in" },
    { key: "embarque", label: "Embarque" },
    { key: "alteracoes", label: "Alterações" },
    { key: "staff", label: "Staff" },
    { key: "socio", label: "Sócio" },
  ],
  staff: [
    { key: "checkin", label: "Check-in" },
    { key: "embarque", label: "Embarque" },
  ],
  // Passageiro: sem filtros — experiência limpa e direta.
  passageiro: [],
};

const iconMap: Record<NotifIconKey, React.ComponentType<{ className?: string }>> = {
  "credit-card": CreditCard,
  clock: Clock,
  ticket: Ticket,
  "qr-code": QrCode,
  bus: Bus,
  calendar: Calendar,
  "user-plus": UserPlus,
  "check-circle": CheckCircle,
  "log-out": LogOut,
  edit: Edit3,
  shield: Shield,
  users: Users,
};

const toneMap: Record<NotifTone, string> = {
  green: "bg-neon-green/15 text-neon-green",
  pink: "bg-neon-pink/15 text-neon-pink",
  purple: "bg-neon-purple/15 text-neon-purple",
  blue: "bg-blue-500/15 text-blue-400",
  amber: "bg-amber-500/15 text-amber-400",
};

type Notif = {
  id: string;
  icon: NotifIconKey;
  tone: NotifTone;
  title: string;
  message: string;
  createdAt: number;
  link?: string;
  excursao?: string;
  read?: boolean;
  __type?: string;
  __data?: Record<string, unknown> | null;
  __excursaoId?: string | null;
  __dbId?: string;
};

// Rótulo do botão "resolver agora" para o painel do excursionista.
function quickActionLabel(title: string): string | null {
  const t = title.toLowerCase();
  if (t.includes("pagamento pendente")) return "Confirmar pagamento";
  if (t.includes("pagamento")) return "Ver pagamento";
  if (t.includes("nova reserva") || t.includes("reserva criada")) return "Ver reserva";
  if (t.includes("alteração de embarque") || t.includes("alteracao de embarque")) return "Abrir alteração";
  if (t.includes("novo staff") || t.includes("novo sócio") || t.includes("novo socio")) return "Visualizar";
  if (t.includes("check-in")) return "Ver check-in";
  return null;
}

export function NotificationPanel({
  children,
  role = "passageiro",
}: {
  children: React.ReactNode;
  role?: NotifRole;
}) {
  const { items, markAllRead, clearAll, markRead } = useNotifications(role);
  const [open, setOpen] = useState(false);
  const roleFilters = FILTERS_BY_ROLE[role] ?? [];
  const hasFilters = roleFilters.length > 0;
  const [filter, setFilter] = useState<NotifCategory | null>(
    hasFilters ? roleFilters[0].key : null,
  );
  const navigate = useNavigate();
  const now = Date.now();

  // Para perfis SEM filtros (passageiro), manter o comportamento original:
  // ao abrir o sino, marca tudo como lido. Para perfis COM filtros, o
  // indicador por categoria precisa permanecer até o usuário entrar nela —
  // a marcação acontece quando a categoria é selecionada (ver efeito abaixo).
  useEffect(() => {
    if (!open || hasFilters) return;
    if (items.some((n) => !n.read)) {
      void markAllRead();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Conta de não-lidas por categoria (para os indicadores nas abas).
  const unreadByCategory = useMemo(() => {
    const acc: Partial<Record<NotifCategory, number>> = {};
    for (const n of items) {
      if (n.read) continue;
      const cat = (n as any).category as NotifCategory | undefined;
      if (!cat) continue;
      acc[cat] = (acc[cat] ?? 0) + 1;
    }
    return acc;
  }, [items]);

  // Ao abrir o painel ou trocar de aba, marca como lidas as notificações
  // visíveis daquela categoria — o indicador da aba desaparece após visualizar.
  useEffect(() => {
    if (!open || !hasFilters || !filter) return;
    const toMark = items.filter(
      (n) => !n.read && (n as any).category === filter && n.__dbId,
    );
    if (toMark.length === 0) return;
    for (const n of toMark) {
      if (n.__dbId) void markRead(n.__dbId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filter]);

  const filteredItems = hasFilters
    ? items.filter((n) => (n as any).category === filter)
    : items;

  const handleClick = (n: Notif) => {
    const target = resolveNotificationRoute(
      n.__type ?? "",
      role,
      n.__data ?? null,
      n.__excursaoId ?? null,
    );
    // Comportamento unificado: clicar apenas marca como lida.
    // Nunca remove do histórico — usuário precisa usar "Limpar histórico".
    if (n.__dbId && !n.read) void markRead(n.__dbId);
    if (!target) return;
    setOpen(false);
    navigate({ to: target as never }).catch(() => {});
  };


  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          {/* Título com padding-right reservando espaço para o X do Sheet (mobile-safe). */}
          <SheetTitle className="flex items-center gap-2 text-base pr-12">
            <Bell className="size-5 text-primary" />
            Notificações
          </SheetTitle>
          {/* Ações globais em linha separada, longe do botão de fechar, com alvo de toque ≥40px. */}
          {items.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={markAllRead}
                className="flex-1 min-h-[40px] text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted rounded-lg px-3 transition"
              >
                Marcar como lidas
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="flex-1 min-h-[40px] text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:bg-destructive/15 rounded-lg px-3 transition inline-flex items-center justify-center gap-1.5"
              >
                <Trash2 className="size-3.5" />
                Limpar histórico
              </button>
            </div>
          )}
        </SheetHeader>
        <div className="flex flex-col overflow-y-auto flex-1">
          {hasFilters && (
            <div className="px-5 pt-3 pb-2">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {roleFilters.map((f) => {
                  const active = filter === f.key;
                  const unread = unreadByCategory[f.key] ?? 0;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFilter(f.key)}
                      className={`relative shrink-0 text-xs font-medium rounded-full px-3 py-1.5 transition border ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/60 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {f.label}
                      {unread > 0 && (
                        <span
                          aria-label={`${unread} não lida${unread > 1 ? "s" : ""}`}
                          className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                            active
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-neon-pink text-white"
                          }`}
                        >
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {filteredItems.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Bell className="size-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {items.length === 0
                  ? "Nenhuma notificação ainda."
                  : "Nenhuma notificação nesta categoria."}
              </p>
            </div>
          ) : (
            (filteredItems as Notif[]).map((n) => {
              const Icon = iconMap[n.icon] ?? Bell;
              const target = resolveNotificationRoute(
                n.__type ?? "",
                role,
                n.__data ?? null,
                n.__excursaoId ?? null,
              );
              const clickable = Boolean(target);
              const quickAction =
                role === "excursionista" && target ? quickActionLabel(n.title) : null;
              const unread = !n.read;
              return (
                <div
                  key={n.id}
                  className={`border-b border-border/40 ${unread ? "bg-primary/[0.04]" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    disabled={!clickable}
                    className={`w-full text-left flex items-start gap-3 px-5 pt-4 ${quickAction ? "pb-2" : "pb-4"} transition ${
                      clickable ? "hover:bg-muted/40 active:bg-muted/60 cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div className={`relative size-9 grid place-items-center rounded-full shrink-0 ${toneMap[n.tone]}`}>
                      <Icon className="size-4" />
                      {unread && (
                        <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-neon-pink border-2 border-background" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug truncate ${unread ? "font-semibold" : "font-medium text-muted-foreground"}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                          {formatRelative(n.createdAt, now)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      {n.excursao && (
                        <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary max-w-full truncate">
                          <Calendar className="size-3 shrink-0" />
                          <span className="truncate">{n.excursao}</span>
                        </span>
                      )}
                    </div>
                    {clickable && !quickAction && (
                      <ChevronRight className="size-4 text-muted-foreground/60 mt-2 shrink-0" />
                    )}
                  </button>
                  {quickAction && (
                    <div className="px-5 pb-3 pl-[68px]">
                      <button
                        type="button"
                        onClick={() => handleClick(n)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 transition inline-flex items-center gap-1"
                      >
                        {quickAction}
                        <ChevronRight className="size-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
