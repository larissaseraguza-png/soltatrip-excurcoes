import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bus, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — SoltaTrip" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Supabase entrega tokens no fragmento da URL (#access_token=...&type=recovery).
    // O cliente faz auto-parse e dispara PASSWORD_RECOVERY em onAuthStateChange.
    // Como o evento pode chegar antes/depois do mount, verificamos ambos.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setHasRecoverySession(true);
        setReady(true);
      }
    });

    // Fallback: se já houver sessão (token recém-parseado), considera válido.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) setHasRecoverySession(true);
      setReady(true);
    });

    // Failsafe contra link inválido/expirado — libera UI em ≤4s.
    const t = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 4000);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // Encerra a sessão de recuperação — o usuário deve logar normalmente
      // com a senha nova. Isso evita herdar contexto/estado da sessão de reset.
      await supabase.auth.signOut().catch(() => {});
      setDone(true);
      setTimeout(() => {
        navigate({ to: "/auth", replace: true });
      }, 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível redefinir a senha.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="flex items-center gap-2 justify-center mb-8 font-display font-bold text-2xl"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-pink to-neon-purple glow-primary">
            <Bus className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="text-gradient">SoltaTrip</span>
        </Link>

        <div className="glass rounded-3xl p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold mb-1">Redefinir senha</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Crie uma nova senha para sua conta.
          </p>

          {!ready && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {ready && !hasRecoverySession && !done && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Link de recuperação inválido ou expirado. Peça um novo link na tela de login.
                </span>
              </div>
              <Link
                to="/auth"
                className="block w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-center leading-[44px]"
              >
                Voltar para o login
              </Link>
            </div>
          )}

          {ready && hasRecoverySession && !done && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <PasswordField
                label="Nova senha"
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggle={() => setShowPassword((s) => !s)}
              />
              <PasswordField
                label="Confirme a nova senha"
                value={confirm}
                onChange={setConfirm}
                show={showPassword}
                onToggle={() => setShowPassword((s) => !s)}
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
                Salvar nova senha
              </button>
            </form>
          )}

          {done && (
            <div className="space-y-4 text-center py-4">
              <CheckCircle2 className="h-12 w-12 mx-auto text-neon-green" />
              <p className="text-sm text-muted-foreground">
                Senha redefinida com sucesso! Redirecionando para o login…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}</span>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Lock className="h-4 w-4" />
        </span>
        <input
          type={show ? "text" : "password"}
          required
          minLength={6}
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className="w-full h-11 rounded-xl bg-secondary/40 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition text-sm pl-10 pr-10"
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-secondary/60 transition focus:outline-none"
        >
          {show ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </label>
  );
}
