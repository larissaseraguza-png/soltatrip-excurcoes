import { useState } from "react";
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

const FILTERS_BY_ROLE: Record<NotifRole, { key: NotifCategory | "todas"; label: string }[]> = {
  excursionista: [
    { key: "todas", label: "Todas" },
    { key: "pagamentos", label: "Pagamentos" },
    { key: "reservas", label: "Reservas" },
    { key: "checkin", label: "Check-in" },
    { key: "embarque", label: "Embarque" },
    { key: "alteracoes", label: "Alterações" },
    { key: "staff", label: "Staff" },
    { key: "socio", label: "Sócio" },
  ],
  staff: [
    { key: "todas", label: "Todas" },
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
  // Campos enriquecidos (V2) — usados pelo resolver dinâmico de rota.
  __type?: string;
  __data?: Record<string, unknown> | null;
  __excursaoId?: string | null;
};

type Group = Notif & { count: number };

function groupNotifications(items: Notif[]): Group[] {
  const map = new Map<string, Group>();
  const order: string[] = [];
  for (const n of items) {
    const key = `${n.title}|${n.link ?? ""}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (n.createdAt > existing.createdAt) {
        existing.createdAt = n.createdAt;
        existing.message = n.message;
        existing.id = n.id;
        existing.__type = n.__type;
        existing.__data = n.__data;
        existing.__excursaoId = n.__excursaoId;
      }
    } else {
      map.set(key, { ...n, count: 1 });
      order.push(key);
    }
  }
  return order
    .map((k) => map.get(k)!)
    .sort((a, b) => b.createdAt - a.createdAt);
}

const pluralRules: Array<[RegExp, (n: number) => string]> = [
  [/^Pagamento aprovado$/, (n) => `${n} pagamentos aprovados`],
  [/^Pagamento pendente$/, (n) => `${n} pagamentos pendentes`],
  [/^Pagamento confirmado$/, (n) => `${n} pagamentos confirmados`],
  [/^Reserva criada$/, (n) => `${n} reservas criadas`],
  [/^Nova reserva$/, (n) => `${n} novas reservas`],
  [/^QR Code liberado$/, (n) => `${n} QR Codes liberados`],
  [/^Alteração de embarque$/, (n) => `${n} alterações de embarque`],
  [/^Excursão atualizada$/, (n) => `${n} excursões atualizadas`],
  [/^Novo passageiro$/, (n) => `${n} novos passageiros`],
  [/^Check-in realizado$/, (n) => `${n} check-ins realizados`],
  [/^Desembarque realizado$/, (n) => `${n} desembarques realizados`],
  [/^Alteração do organizador$/, (n) => `${n} alterações do organizador`],
  [/^Alteração da staff$/, (n) => `${n} alterações da staff`],
  [/^Alteração do sócio$/, (n) => `${n} alterações do sócio`],
  [/^Novo staff$/, (n) => `${n} novos membros de staff`],
  [/^Novo sócio$/, (n) => `${n} novos sócios`],
];

function pluralTitle(title: string, count: number): string {
  for (const [re, fn] of pluralRules) if (re.test(title)) return fn(count);
  return `${count}× ${title}`;
}

// Rótulo do botão "resolver agora" para o painel do excursionista.
// Retorna null para evitar excesso de botões quando a ação não é operacional.
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
  const { items, markAllRead, clearAll } = useNotifications(role);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotifCategory | "todas">("todas");
  const roleFilters = FILTERS_BY_ROLE[role] ?? [];
  const isPassageiro = role === "passageiro";
  const navigate = useNavigate();
  // Renderização do tempo é congelada no momento da abertura para evitar
  // loops de re-render. Sem auto-marcar como lida; sem intervalos.
  const now = Date.now();

  const filteredItems =
    filter === "todas"
      ? items
      : items.filter((n) => (n as any).category === filter);

  const handleClick = (g: Group) => {
    const target = resolveNotificationRoute(
      g.__type ?? "",
      role,
      g.__data ?? null,
      g.__excursaoId ?? null,
    );
    if (!target) return;
    setOpen(false);
    navigate({ to: target as never }).catch(() => {});
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <SheetTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <Bell className="size-5 text-primary" />
              Notificações
            </span>
            {items.length > 0 && (
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-normal text-muted-foreground hover:text-foreground transition"
                >
                  Marcar como lidas
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs font-normal text-muted-foreground hover:text-foreground transition flex items-center gap-1"
                >
                  <Trash2 className="size-3.5" />
                  Limpar
                </button>
              </span>
            )}
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col overflow-y-auto flex-1">
          {items.length > 0 && roleFilters.length > 0 && (
            <div className="px-5 pt-3 pb-2">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {roleFilters.map((f) => {
                  const active = filter === f.key;
                  const count =
                    f.key === "todas"
                      ? items.length
                      : items.filter((n) => (n as any).category === f.key).length;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFilter(f.key)}
                      className={`shrink-0 text-xs font-medium rounded-full px-3 py-1.5 transition border ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/60 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {f.label} {count > 0 && `(${count})`}
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
            groupNotifications(filteredItems).map((g) => {
              const Icon = iconMap[g.icon] ?? Bell;
              const target = resolveNotificationRoute(
                g.__type ?? "",
                role,
                g.__data ?? null,
                g.__excursaoId ?? null,
              );
              const clickable = Boolean(target);
              const displayTitle = g.count > 1 ? pluralTitle(g.title, g.count) : g.title;
              const quickAction =
                role === "excursionista" && target ? quickActionLabel(g.title) : null;
              return (
                <div key={g.id} className="border-b border-border/40">
                  <button
                    type="button"
                    onClick={() => handleClick(g)}
                    disabled={!clickable}
                    className={`w-full text-left flex items-start gap-3 px-5 pt-4 ${quickAction ? "pb-2" : "pb-4"} transition ${
                      clickable ? "hover:bg-muted/40 active:bg-muted/60 cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div className={`relative size-9 grid place-items-center rounded-full shrink-0 ${toneMap[g.tone]}`}>
                      <Icon className="size-4" />
                      {g.count > 1 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 grid place-items-center text-[10px] font-bold rounded-full bg-neon-pink text-white border-2 border-background">
                          {g.count > 99 ? "99+" : g.count}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-snug truncate">{displayTitle}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                          {formatRelative(g.createdAt, now)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                        {g.count > 1 ? `Última: ${g.message}` : g.message}
                      </p>
                      {g.excursao && (
                        <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary max-w-full truncate">
                          <Calendar className="size-3 shrink-0" />
                          <span className="truncate">{g.excursao}</span>
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
                        onClick={() => handleClick(g)}
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
