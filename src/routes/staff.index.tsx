import { createFileRoute, Link } from "@tanstack/react-router";
import { StaffShell, Pill } from "@/components/staff/Shell";
import {
  Users, Wallet, QrCode, LifeBuoy, UserCog, MessageCircle,
  Activity, AlertTriangle, Bus, TrendingUp, CheckCircle2, Clock,
} from "lucide-react";

export const Route = createFileRoute("/staff/")({
  component: StaffDashboard,
});

function StaffDashboard() {
  const stats = [
    { label: "Excursões ativas", value: "4", icon: Activity, tone: "from-neon-green to-neon-purple" },
    { label: "Passageiros", value: "312", icon: Users, tone: "from-neon-purple to-neon-pink" },
    { label: "Ônibus ativos", value: "6", icon: Bus, tone: "from-neon-pink to-neon-purple" },
    { label: "Arrecadado", value: "R$ 84k", icon: TrendingUp, tone: "from-neon-green to-neon-pink" },
  ];

  const quickCards = [
    { to: "/staff/passageiros", icon: Users, label: "Passageiros", desc: "312 cadastrados" },
    { to: "/staff/financeiro", icon: Wallet, label: "Financeiro", desc: "R$ 12k pendente" },
    { to: "/staff/checkin", icon: QrCode, label: "Check-in", desc: "Embarques live" },
    { to: "/staff/suporte", icon: LifeBuoy, label: "Suporte", desc: "3 ocorrências" },
    { to: "/staff/equipe", icon: UserCog, label: "Equipe", desc: "12 membros" },
    { to: "/staff/mensagens", icon: MessageCircle, label: "Mensagens", desc: "8 não lidas" },
  ];

  const alerts = [
    { tone: "red", title: "Ônibus #03 com atraso", time: "agora" },
    { tone: "yellow", title: "4 pagamentos vencendo hoje", time: "10 min" },
    { tone: "green", title: "Excursão Tomorrowland confirmada", time: "1h" },
  ] as const;

  const activity = [
    { who: "Bianca M.", what: "embarcou no Ônibus #01", when: "agora", icon: CheckCircle2, tone: "text-neon-green" },
    { who: "Lucas P.", what: "confirmou PIX R$ 450", when: "2 min", icon: Wallet, tone: "text-neon-pink" },
    { who: "Staff Diego", what: "criou ocorrência atraso", when: "5 min", icon: AlertTriangle, tone: "text-yellow-300" },
    { who: "Marina S.", what: "alterou poltrona 12A → 14B", when: "8 min", icon: Users, tone: "text-neon-purple" },
    { who: "Rafa T.", what: "embarcou no Ônibus #02", when: "12 min", icon: CheckCircle2, tone: "text-neon-green" },
  ];

  return (
    <StaffShell title="Central Staff" subtitle="Operação SoltaTrip · ao vivo">
      <section className="grid grid-cols-2 gap-3 mb-6">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="glass rounded-2xl p-4">
            <div className={`size-9 rounded-xl bg-gradient-to-br ${tone} grid place-items-center mb-3 glow-primary`}>
              <Icon className="size-4 text-primary-foreground" />
            </div>
            <div className="text-2xl font-display font-black">{value}</div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </section>

      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Acesso rápido</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickCards.map(({ to, icon: Icon, label, desc }) => (
            <Link key={to} to={to} className="glass rounded-2xl p-4 hover:glow-primary transition group">
              <Icon className="size-5 text-neon-green mb-2 group-hover:scale-110 transition" />
              <div className="font-semibold text-sm">{label}</div>
              <div className="text-[11px] text-muted-foreground">{desc}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Alertas</h2>
          <Pill tone="red">3 novos</Pill>
        </div>
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className="glass rounded-xl p-3 flex items-center gap-3">
              <span className={`size-2 rounded-full animate-pulse-glow ${
                a.tone === "red" ? "bg-destructive" : a.tone === "yellow" ? "bg-yellow-400" : "bg-neon-green"
              }`} />
              <div className="flex-1 text-sm font-medium">{a.title}</div>
              <span className="text-[10px] text-muted-foreground">{a.time}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Atividade ao vivo</h2>
          <span className="flex items-center gap-1.5 text-[10px] text-neon-green">
            <span className="size-1.5 rounded-full bg-neon-green animate-pulse-glow" /> LIVE
          </span>
        </div>
        <div className="glass rounded-2xl divide-y divide-border/60">
          {activity.map((a, i) => (
            <div key={i} className="p-3 flex items-center gap-3">
              <a.icon className={`size-4 ${a.tone}`} />
              <div className="flex-1 text-sm">
                <span className="font-semibold">{a.who}</span>{" "}
                <span className="text-muted-foreground">{a.what}</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="size-3" /> {a.when}
              </span>
            </div>
          ))}
        </div>
      </section>
    </StaffShell>
  );
}
