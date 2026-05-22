import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Users, Wallet, QrCode, MessageCircle, ArrowLeft, Bell } from "lucide-react";
import type { ReactNode } from "react";

type ShellProps = {
  title?: string;
  subtitle?: string;
  back?: string;
  right?: ReactNode;
  children: ReactNode;
  hideNav?: boolean;
};

export function Shell({ title, subtitle, back, right, children, hideNav }: ShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="fixed inset-x-0 top-0 h-64 pointer-events-none"
        style={{ background: "var(--gradient-glow)" }} />

      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/60">
        <div className="max-w-screen-md mx-auto px-5 py-4 flex items-center gap-3">
          {back ? (
            <Link to={back} className="size-10 grid place-items-center rounded-full glass hover:glow-primary transition">
              <ArrowLeft className="size-5" />
            </Link>
          ) : (
            <div className="size-10 grid place-items-center rounded-full bg-gradient-to-br from-neon-purple to-neon-pink glow-primary">
              <span className="font-display font-black text-primary-foreground">S</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            {title && <h1 className="text-lg font-display font-bold truncate">{title}</h1>}
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
          {right ?? (
            <button className="size-10 grid place-items-center rounded-full glass relative">
              <Bell className="size-5" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-neon-green animate-pulse-glow" />
            </button>
          )}
        </div>
      </header>

      <main className="relative max-w-screen-md mx-auto px-5 py-6">{children}</main>

      {!hideNav && <BottomNav />}
    </div>
  );
}

function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/excursionista", icon: Home, label: "Início" },
    { to: "/excursionista/passageiros", icon: Users, label: "Pax" },
    { to: "/excursionista/checkin", icon: QrCode, label: "Check-in" },
    { to: "/excursionista/financeiro", icon: Wallet, label: "Caixa" },
    { to: "/excursionista/chat", icon: MessageCircle, label: "Chat" },
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 px-4 pb-4">
      <div className="max-w-screen-md mx-auto glass rounded-3xl px-2 py-2 flex items-center justify-between shadow-2xl">
        {items.map(({ to, icon: Icon, label }) => {
          const active = to === "/excursionista" ? path === to : path.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition ${
                active ? "bg-gradient-to-br from-neon-purple/30 to-neon-pink/20 text-neon-pink glow-text" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function StatusBadge({ status }: { status: "confirmada" | "lotando" | "encerrada" | "pago" | "pendente" | "cancelado" }) {
  const map: Record<string, string> = {
    confirmada: "bg-neon-green/20 text-neon-green border-neon-green/40",
    lotando: "bg-neon-pink/20 text-neon-pink border-neon-pink/40",
    encerrada: "bg-muted text-muted-foreground border-border",
    pago: "bg-neon-green/20 text-neon-green border-neon-green/40",
    pendente: "bg-yellow-400/20 text-yellow-300 border-yellow-400/40",
    cancelado: "bg-destructive/20 text-destructive border-destructive/40",
  };
  return (
    <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border ${map[status]}`}>
      {status}
    </span>
  );
}
