import { createFileRoute, Navigate, useNavigate, redirect } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { isFlowLocked } from "@/config/flow-mode";
import { Bus, Crown, Shield, Ticket, ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/selecionar-perfil")({
  beforeLoad: () => {
    if (isFlowLocked()) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [{ title: "Selecionar perfil — SoltaTrip" }, { name: "robots", content: "noindex" }],
  }),
  component: SelecionarPerfilPage,
});

type Perfil = {
  id: "excursionista" | "staff" | "passageiro";
  titulo: string;
  desc: string;
  icon: typeof Crown;
  to: "/app" | "/staff" | "/passageiro";
  tone: "pink" | "purple" | "green";
  tag: string;
};

const perfis: Perfil[] = [
  {
    id: "excursionista",
    titulo: "Excursionista",
    desc: "Organizador. Acesso completo: excursões, financeiro, passageiros e check-in.",
    icon: Crown,
    to: "/app",
    tone: "pink",
    tag: "ORGANIZADOR",
  },
  {
    id: "staff",
    titulo: "Staff",
    desc: "Apoio na operação. Foco em check-in, lista de passageiros e suporte.",
    icon: Shield,
    to: "/staff",
    tone: "purple",
    tag: "OPERAÇÃO",
  },
  {
    id: "passageiro",
    titulo: "Passageiro",
    desc: "Suas viagens, ponto de embarque, status de pagamento e QR Code.",
    icon: Ticket,
    to: "/passageiro",
    tone: "green",
    tag: "VIAGEM",
  },
];

const accents = {
  pink: { border: "hover:border-neon-pink/60", glow: "from-neon-pink/30 to-transparent", text: "text-neon-pink" },
  purple: { border: "hover:border-neon-purple/60", glow: "from-neon-purple/30 to-transparent", text: "text-neon-purple" },
  green: { border: "hover:border-neon-green/60", glow: "from-neon-green/30 to-transparent", text: "text-neon-green" },
};

function SelecionarPerfilPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" />;

  function escolher(p: Perfil) {
    try {
      localStorage.setItem("soltatrip:perfil", p.id);
    } catch {}
    navigate({ to: p.to });
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="relative mx-auto max-w-5xl">
        <div className="flex items-center gap-2 justify-center mb-10 mt-4 font-display font-bold text-2xl">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-pink to-neon-purple glow-primary">
            <Bus className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="text-gradient">SoltaTrip</span>
        </div>

        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-[11px] font-bold tracking-[0.22em] text-neon-pink">COMO VOCÊ QUER ENTRAR?</span>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl font-bold leading-[1.05]">
            Selecione seu <span className="text-gradient">perfil</span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground">
            Cada perfil tem sua própria navegação e permissões.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {perfis.map((p) => {
            const a = accents[p.tone];
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                onClick={() => escolher(p)}
                className={`group text-left glass rounded-3xl p-7 transition-all duration-300 border ${a.border} hover:-translate-y-1 relative overflow-hidden`}
              >
                <div className={`absolute -top-20 -right-20 h-48 w-48 bg-gradient-to-br ${a.glow} rounded-full blur-3xl opacity-60 group-hover:opacity-100 transition`} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-6">
                    <span className={`text-[10px] font-bold tracking-[0.18em] ${a.text}`}>{p.tag}</span>
                    <Icon className={`h-5 w-5 ${a.text}`} />
                  </div>
                  <h3 className="font-display text-2xl font-bold leading-tight">{p.titulo}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                  <div className={`mt-6 inline-flex items-center gap-1.5 text-sm font-semibold ${a.text} group-hover:gap-2.5 transition-all`}>
                    Entrar como {p.titulo.toLowerCase()} <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
