import { createFileRoute, Link, useNavigate, Navigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoleForUser, roleHome, type AppRole } from "@/hooks/use-role";
import {
  Bus, Loader2, Mail, Lock, AlertCircle, Crown, Shield, Ticket, ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Entrar — SoltaTrip" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthPage,
});

type RoleCard = {
  id: AppRole;
  titulo: string;
  desc: string;
  icon: typeof Crown;
  tone: "pink" | "purple" | "green";
  tag: string;
};

const roles: RoleCard[] = [
  { id: "excursionista", titulo: "Excursionista", desc: "Organizador. Acesso completo ao sistema.", icon: Crown, tone: "pink", tag: "ORGANIZADOR" },
  { id: "staff", titulo: "Staff", desc: "Equipe de apoio. Check-in e operação.", icon: Shield, tone: "purple", tag: "EQUIPE" },
  { id: "passageiro", titulo: "Passageiro", desc: "Suas viagens, ticket e pagamento.", icon: Ticket, tone: "green", tag: "VIAGEM" },
];

const accents = {
  pink: { border: "hover:border-neon-pink/60 data-[active=true]:border-neon-pink", glow: "from-neon-pink/30 to-transparent", text: "text-neon-pink" },
  purple: { border: "hover:border-neon-purple/60 data-[active=true]:border-neon-purple", glow: "from-neon-purple/30 to-transparent", text: "text-neon-purple" },
  green: { border: "hover:border-neon-green/60 data-[active=true]:border-neon-green", glow: "from-neon-green/30 to-transparent", text: "text-neon-green" },
};

function AuthPage() {
  const { user, loading } = useAuth();
  const { role, loading: roleLoading } = useRoleForUser(user, loading);
  const navigate = useNavigate();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<"role" | "credentials">("role");
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading || (!busy && user && roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Já autenticado: retoma convite pendente ou vai para a área do papel.
  if (!busy && user && role) {
    const pendingStaff = typeof window !== "undefined" ? localStorage.getItem("pending_staff_invite") : null;
    if (pendingStaff) return <Navigate to="/invite/staff/$token" params={{ token: pendingStaff }} />;
    const pendingPax = typeof window !== "undefined" ? localStorage.getItem("pending_pax_invite") : null;
    if (pendingPax) return <Navigate to="/invite/passageiro/$token" params={{ token: pendingPax }} />;
    return <Navigate to={roleHome[role]} />;
  }

  function pickRole(r: AppRole) {
    setError(null);
    setInfo(null);
    setSelectedRole(r);
    setStep("credentials");
  }

  function backToRole() {
    setStep("role");
    setError(null);
    setInfo(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedRole) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const cleanPhone = phone.replace(/\D/g, "");
        if (cleanPhone.length < 10) throw new Error("Telefone inválido. Inclua DDD.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, phone: cleanPhone, role: selectedRole },
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });
        if (error) {
          const msg = (error.message || "").toLowerCase();
          if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("user already")) {
            throw new Error("Este e-mail já está cadastrado. Se ainda não confirmou, verifique sua caixa de entrada (e spam) ou clique em 'Entrar' para reenviar.");
          }
          if (msg.includes("rate limit") || msg.includes("after") && msg.includes("seconds")) {
            throw new Error("Aguarde alguns segundos antes de tentar novamente.");
          }
          throw error;
        }
        // Supabase retorna user com identities=[] quando o e-mail já existe (sem erro)
        const identities = (data.user as any)?.identities;
        if (data.user && Array.isArray(identities) && identities.length === 0) {
          throw new Error("Este e-mail já está cadastrado. Verifique sua caixa de entrada (e spam) para o link de confirmação, ou tente fazer login.");
        }
        if (!data.user) throw new Error("Não foi possível criar a conta. Tente novamente em alguns instantes.");

        // E-mail de confirmação é obrigatório: nunca haverá sessão aqui.
        setInfo("Conta criada! Enviamos um e-mail de confirmação para " + email + ". Clique no link recebido para ativar sua conta antes de fazer login.");
        setMode("signin");
        setPassword("");
      } else {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message?.toLowerCase().includes("email not confirmed")) {
            throw new Error("E-mail ainda não confirmado. Verifique sua caixa de entrada e clique no link de confirmação.");
          }
          throw error;
        }
        if (!data.user) throw new Error("Falha ao entrar.");
        if (!data.user.email_confirmed_at && !(data.user as any).confirmed_at) {
          await supabase.auth.signOut();
          throw new Error("E-mail ainda não confirmado. Verifique sua caixa de entrada.");
        }

        // Valida função
        const { data: rRow, error: roleErr } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (roleErr) throw roleErr;

        const userRole = rRow?.role as AppRole | undefined;
        if (!userRole || userRole !== selectedRole) {
          await supabase.auth.signOut();
          throw new Error("Você não tem acesso a este tipo de perfil");
        }
        const pendingStaff = localStorage.getItem("pending_staff_invite");
        const pendingPax = localStorage.getItem("pending_pax_invite");
        if (pendingStaff) {
          navigate({ to: "/invite/staff/$token", params: { token: pendingStaff }, replace: true });
        } else if (pendingPax) {
          navigate({ to: "/invite/passageiro/$token", params: { token: pendingPax }, replace: true });
        } else {
          navigate({ to: roleHome[userRole], replace: true });
        }
      }
    } catch (err: any) {
      setError(err.message ?? "Erro inesperado");
    } finally {
      setBusy(false);
    }
  }

  const currentRole = selectedRole ? roles.find((r) => r.id === selectedRole)! : null;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="relative w-full max-w-2xl">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8 font-display font-bold text-2xl">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-pink to-neon-purple glow-primary">
            <Bus className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="text-gradient">SoltaTrip</span>
        </Link>

        <div className="glass rounded-3xl p-6 sm:p-8">
          <div className="flex gap-2 rounded-xl bg-secondary/50 p-1 mb-6">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setStep("role"); setSelectedRole(null); setError(null); setInfo(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                  mode === m ? "bg-primary text-primary-foreground glow-primary" : "text-muted-foreground"
                }`}
              >
                {m === "signin" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {step === "role" && (
            <>
              <h1 className="font-display text-2xl font-bold mb-1">
                {mode === "signin" ? "Como você quer entrar?" : "Que tipo de conta?"}
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                Selecione seu perfil para continuar.
              </p>

              <div className="grid sm:grid-cols-3 gap-3">
                {roles.map((p) => {
                  const a = accents[p.tone];
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => pickRole(p.id)}
                      className={`group text-left glass rounded-2xl p-5 transition-all duration-300 border ${a.border} hover:-translate-y-1 relative overflow-hidden`}
                    >
                      <div className={`absolute -top-16 -right-16 h-40 w-40 bg-gradient-to-br ${a.glow} rounded-full blur-3xl opacity-60 group-hover:opacity-100 transition`} />
                      <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-[10px] font-bold tracking-[0.18em] ${a.text}`}>{p.tag}</span>
                          <Icon className={`h-5 w-5 ${a.text}`} />
                        </div>
                        <h3 className="font-display text-lg font-bold leading-tight">{p.titulo}</h3>
                        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {info && (
                <div className="mt-6 text-sm text-neon-green bg-neon-green/10 border border-neon-green/30 rounded-lg px-3 py-2">
                  {info}
                </div>
              )}
            </>
          )}

          {step === "credentials" && currentRole && (
            <>
              <button
                type="button"
                onClick={backToRole}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-4 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Mudar perfil
              </button>

              <div className="flex items-center gap-3 mb-5">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl glass ${accents[currentRole.tone].text}`}>
                  <currentRole.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground">
                    {mode === "signin" ? "ENTRAR COMO" : "CRIAR CONTA DE"}
                  </div>
                  <div className="font-display text-lg font-bold">{currentRole.titulo}</div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {mode === "signup" && (
                  <>
                    <Field label="Nome completo" value={fullName} onChange={setFullName} required placeholder="Como te chamam?" />
                  </>
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
                {mode === "signup" && (
                  <Field
                    label="Telefone (com DDD)"
                    type="tel"
                    value={phone}
                    onChange={setPhone}
                    required
                    placeholder="(11) 99999-0000"
                  />
                )}
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

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold glow-primary hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === "signin" ? `Entrar como ${currentRole.titulo}` : `Criar conta de ${currentRole.titulo}`}
                </button>
              </form>
            </>
          )}
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
