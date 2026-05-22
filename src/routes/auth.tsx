import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Bus, Loader2, Mail, Lock, AlertCircle, Crown, Shield, Ticket, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Entrar — SoltaTrip" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (user) return <ProfileStep />;


  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/selecionar-perfil`,
          },
        });
        if (error) throw error;
        if (!data.session) {
          setInfo("Conta criada! Faça login para continuar.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message ?? "Erro inesperado");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8 font-display font-bold text-2xl">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-pink to-neon-purple glow-primary">
            <Bus className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="text-gradient">SoltaTrip</span>
        </Link>

        <div className="glass rounded-3xl p-7">
          <div className="flex gap-2 rounded-xl bg-secondary/50 p-1 mb-6">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); setInfo(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                  mode === m ? "bg-primary text-primary-foreground glow-primary" : "text-muted-foreground"
                }`}
              >
                {m === "signin" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <h1 className="font-display text-2xl font-bold mb-1">
            {mode === "signin" ? "Bem-vindo de volta" : "Bora soltar a próxima"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "signin" ? "Entre para gerenciar suas excursões." : "Crie sua conta de organizador."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <Field
                label="Nome completo"
                value={fullName}
                onChange={setFullName}
                required
                placeholder="Como te chamam?"
              />
            )}
            <Field
              label="E-mail"
              type="email"
              icon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={setEmail}
              required
              placeholder="voce@email.com"
            />
            <Field
              label="Senha"
              type="password"
              icon={<Lock className="h-4 w-4" />}
              value={password}
              onChange={setPassword}
              required
              minLength={6}
              placeholder="••••••••"
            />

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {info && (
              <div className="text-sm text-neon-green bg-neon-green/10 border border-neon-green/30 rounded-lg px-3 py-2">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold glow-primary hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Entrar" : "Criar conta"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

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
    desc: "Organizador com acesso total ao sistema.",
    icon: Crown,
    to: "/app",
    tone: "pink",
    tag: "ORGANIZADOR",
  },
  {
    id: "staff",
    titulo: "Staff",
    desc: "Equipe de apoio para operação e check-in.",
    icon: Shield,
    to: "/staff",
    tone: "purple",
    tag: "EQUIPE",
  },
  {
    id: "passageiro",
    titulo: "Passageiro",
    desc: "Acesso às viagens, ticket, pagamento e avisos.",
    icon: Ticket,
    to: "/passageiro",
    tone: "green",
    tag: "VIAGEM",
  },
];

const profileAccents = {
  pink: { border: "hover:border-neon-pink/60", glow: "from-neon-pink/30 to-transparent", text: "text-neon-pink" },
  purple: { border: "hover:border-neon-purple/60", glow: "from-neon-purple/30 to-transparent", text: "text-neon-purple" },
  green: { border: "hover:border-neon-green/60", glow: "from-neon-green/30 to-transparent", text: "text-neon-green" },
};

function ProfileStep() {
  const navigate = useNavigate();

  function escolher(p: Perfil) {
    try {
      localStorage.setItem("soltatrip:perfil", p.id);
    } catch {}
    navigate({ to: p.to });
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 flex items-center justify-center">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="relative w-full max-w-5xl py-8">
        <div className="flex items-center gap-2 justify-center mb-8 font-display font-bold text-2xl">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-pink to-neon-purple glow-primary">
            <Bus className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="text-gradient">SoltaTrip</span>
        </div>

        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-[11px] font-bold tracking-[0.22em] text-neon-pink">LOGIN REALIZADO</span>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl font-bold leading-[1.05]">
            Escolha como quer <span className="text-gradient">entrar</span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground">
            Selecione o perfil para abrir a página correta da plataforma.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {perfis.map((p) => {
            const a = profileAccents[p.tone];
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => escolher(p)}
                className={`group text-left glass rounded-3xl p-6 transition-all duration-300 border ${a.border} hover:-translate-y-1 relative overflow-hidden`}
              >
                <div className={`absolute -top-20 -right-20 h-48 w-48 bg-gradient-to-br ${a.glow} rounded-full blur-3xl opacity-60 group-hover:opacity-100 transition`} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-5">
                    <span className={`text-[10px] font-bold tracking-[0.18em] ${a.text}`}>{p.tag}</span>
                    <Icon className={`h-5 w-5 ${a.text}`} />
                  </div>
                  <h2 className="font-display text-2xl font-bold leading-tight">{p.titulo}</h2>
                  <p className="mt-3 min-h-12 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                  <div className={`mt-6 inline-flex items-center gap-1.5 text-sm font-semibold ${a.text} group-hover:gap-2.5 transition-all`}>
                    Entrar como {p.titulo} <ArrowRight className="h-4 w-4" />
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

function Field({
  label, value, onChange, type = "text", required, placeholder, icon, minLength,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string; icon?: React.ReactNode; minLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}</span>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        )}
        <input
          type={type}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-11 rounded-xl bg-secondary/40 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition text-sm ${icon ? "pl-10 pr-3" : "px-3"}`}
        />
      </div>
    </label>
  );
}
