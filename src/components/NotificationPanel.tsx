import { useEffect, useState } from "react";
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
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useNotifications } from "@/hooks/useNotifications";
import { formatRelative, type NotifIconKey, type NotifRole, type NotifTone } from "@/lib/notifications/store";

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

export function NotificationPanel({
  children,
  role = "passageiro",
}: {
  children: React.ReactNode;
  role?: NotifRole;
}) {
  const { items, markAllRead, clearAll } = useNotifications(role);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const t = setTimeout(() => markAllRead(), 400);
    const i = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearTimeout(t);
      clearInterval(i);
    };
  }, [open, markAllRead]);

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
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-normal text-muted-foreground hover:text-foreground transition flex items-center gap-1"
              >
                <Trash2 className="size-3.5" />
                Limpar
              </button>
            )}
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col overflow-y-auto flex-1">
          {items.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Bell className="size-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação ainda.
              </p>
            </div>
          ) : (
            items.map((n) => {
              const Icon = iconMap[n.icon] ?? Bell;
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3 px-5 py-4 border-b border-border/40 hover:bg-muted/30 transition"
                >
                  <div
                    className={`size-9 grid place-items-center rounded-full shrink-0 ${toneMap[n.tone]}`}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">{n.title}</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {formatRelative(n.createdAt, now)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
