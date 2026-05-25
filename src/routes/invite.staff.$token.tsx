import { createFileRoute, useNavigate, useParams, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { invalidateRoles, setActiveRole } from "@/hooks/use-role";
import { isFlowLocked } from "@/config/flow-mode";
import { Bus, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/invite/staff/$token")({
  beforeLoad: () => {
    if (isFlowLocked()) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Convite de staff — SoltaTrip" }, { name: "robots", content: "noindex" }] }),
  component: InviteStaffPage,
});

const PAPEL_LABEL: Record<string, string> = {
  motorista: "Motorista",
  apoio: "Apoio",
  seguranca: "Segurança",
  coordenador: "Coordenador",
  staff: "Staff",
  lider: "Líder",
};

function InviteStaffPage() {
  const { token } = useParams({ from: "/invite/staff/$token" });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { data: invite, isLoading } = useQuery({
    queryKey: ["invite", token],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .rpc("get_staff_invitation", { p_token: token })
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Se convite já foi usado por este mesmo usuário, vai direto pra área de staff
  useEffect(() => {
    if (authLoading || !invite) return;
    if (invite.used && user && invite.used_by === user.id) {
      localStorage.removeItem("pending_staff_invite");
      navigate({ to: "/staff", replace: true });
    }
  }, [invite, user, authLoading, navigate]);

  // Guarda token só se ainda for utilizável (não usado e não expirado)
  useEffect(() => {
    if (!invite || user) return;
    const expirado = new Date(invite.expires_at) < new Date();
    if (!invite.used && !expirado) {
      localStorage.setItem("pending_staff_invite", token);
    }
  }, [user, token, invite]);

  async function aceitar() {
    setError(null);
    setAccepting(true);
    try {
      const { error } = await supabase.rpc("accept_staff_invitation", { p_token: token });
      if (error) throw error;
      localStorage.removeItem("pending_staff_invite");
      invalidateRoles(user?.id);
      setActiveRole("staff");
      setDone(true);
      setTimeout(() => navigate({ to: "/staff", replace: true }), 1200);
    } catch (err: any) {
      const msg = err.message ?? "";
      if (msg.includes("expired")) setError("Este convite expirou.");
      else if (msg.includes("already_used")) setError("Este convite já foi usado.");
      else if (msg.includes("invalid_token")) setError("Convite inválido.");
      else setError(msg || "Erro ao aceitar convite.");
    } finally {
      setAccepting(false);
    }
  }

  if (authLoading || isLoading) {
    return <Center><Loader2 className="h-6 w-6 animate-spin text-primary" /></Center>;
  }

  if (!invite) {
    return (
      <Center>
        <div className="glass rounded-3xl p-8 max-w-md text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <h1 className="font-display text-xl font-bold mb-2">Convite inválido</h1>
          <p className="text-sm text-muted-foreground">Este link não existe ou foi removido.</p>
        </div>
      </Center>
    );
  }

  const expirado = new Date(invite.expires_at) < new Date();
  const exc = {
    id: invite.excursao_id,
    titulo: invite.excursao_titulo,
    destino: invite.excursao_destino,
    data_evento: invite.excursao_data_evento,
  };

  return (
    <Center>
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-6 font-display font-bold text-xl">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-neon-pink to-neon-purple glow-primary">
            <Bus className="h-4 w-4 text-primary-foreground" />
          </span>
          <span className="text-gradient">SoltaTrip</span>
        </Link>

        <div className="glass rounded-3xl p-6">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-green grid place-items-center mb-4 glow-primary">
            <ShieldCheck className="size-6" />
          </div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-neon-purple mb-1">CONVITE DE STAFF</p>
          <h1 className="font-display text-2xl font-bold mb-1">{exc?.titulo ?? "Excursão"}</h1>
          <p className="text-sm text-muted-foreground mb-5">
            Você foi convidado como <span className="font-semibold text-foreground">{PAPEL_LABEL[invite.papel] ?? invite.papel}</span>
            {exc?.destino ? ` para ${exc.destino}` : ""}.
          </p>

          {invite.used ? (
            user && invite.used_by === user.id ? (
              <Msg tone="success" icon={CheckCircle2}>Convite já vinculado. Abrindo área de staff…</Msg>
            ) : !user ? (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  Este convite já foi aceito. Entre com a sua conta para acessar a área de staff.
                </p>
                <Link
                  to="/auth"
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold glow-primary hover:opacity-90 flex items-center justify-center"
                >
                  Fazer login
                </Link>
              </>
            ) : (
              <Msg tone="error" icon={AlertCircle}>
                Este convite foi aceito por outra conta. Saia e entre com a conta correta.
              </Msg>
            )
          ) : expirado ? (
            <Msg tone="error" icon={AlertCircle}>Este convite expirou. Peça um novo ao organizador.</Msg>
          ) : done ? (
            <Msg tone="success" icon={CheckCircle2}>Vínculo criado! Redirecionando…</Msg>
          ) : !user ? (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                Faça login ou crie sua conta de staff para aceitar.
              </p>
              <Link
                to="/auth"
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold glow-primary hover:opacity-90 flex items-center justify-center"
              >
                Entrar / Criar conta
              </Link>
            </>
          ) : (
            <>
              {error && <Msg tone="error" icon={AlertCircle}>{error}</Msg>}
              <button
                onClick={aceitar}
                disabled={accepting}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold glow-primary hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {accepting && <Loader2 className="h-4 w-4 animate-spin" />}
                Aceitar e vincular
              </button>
            </>
          )}
        </div>
      </div>
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="relative w-full flex items-center justify-center">{children}</div>
    </div>
  );
}

function Msg({ tone, icon: Icon, children }: { tone: "error" | "success"; icon: any; children: React.ReactNode }) {
  const cls =
    tone === "error"
      ? "text-red-400 bg-red-500/10 border-red-500/30"
      : "text-neon-green bg-neon-green/10 border-neon-green/30";
  return (
    <div className={`flex items-start gap-2 text-sm border rounded-lg px-3 py-2 mb-3 ${cls}`}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
