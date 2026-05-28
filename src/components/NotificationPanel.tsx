import { Bell, CheckCircle, UserPlus, CreditCard } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const mockNotifications = [
  {
    id: 1,
    icon: CreditCard,
    title: "Pagamento confirmado",
    message: "Sua reserva foi paga com sucesso.",
    time: "2 min atrás",
    tone: "green" as const,
  },
  {
    id: 2,
    icon: UserPlus,
    title: "Novo passageiro registrado",
    message: "João Silva acabou de se cadastrar na excursão.",
    time: "15 min atrás",
    tone: "purple" as const,
  },
  {
    id: 3,
    icon: CheckCircle,
    title: "Check-in realizado",
    message: "Você confirmou presença no evento.",
    time: "1h atrás",
    tone: "pink" as const,
  },
];

type Tone = "green" | "pink" | "purple";

const toneMap: Record<Tone, string> = {
  green: "bg-neon-green/15 text-neon-green",
  pink: "bg-neon-pink/15 text-neon-pink",
  purple: "bg-neon-purple/15 text-neon-purple",
};

export function NotificationPanel({ children }: { children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Bell className="size-5 text-primary" />
            Notificações
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col">
          {mockNotifications.map((n) => {
            const Icon = n.icon;
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
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug">{n.title}</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                    {n.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    {n.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
