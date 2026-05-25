import { createFileRoute, useNavigate, useParams, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { invalidateRoles, setActiveRole } from "@/hooks/use-role";
import { isFlowLocked } from "@/config/flow-mode";
import { Bus, Loader2, CheckCircle2, AlertCircle, Ticket } from "lucide-react";

export const Route = createFileRoute("/invite/passageiro/$token")({
  beforeLoad: () => {
    if (isFlowLocked()) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Convite de passageiro — SoltaTrip" }, { name: "robots", content: "noindex" }] }),
  component: InvitePassageiroPage,
});

function InvitePassageiroPage() {
  const { token } = useParams({ from: "/invite/passageiro/$token" });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { data: invite, isLoading } = useQuery({
    queryKey: ["passageiro-invite", token],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .rpc("get_passageiro_invite", { p_token: token })
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!user) localStorage.setItem("pending_pax_invite", token);
  }, [user, token]);

  async function aceitar() {
    setError(null);
    setAccepting(true);
    try {
      const { data, error } = await supabase.rpc("claim_passageiro_invite", { p_token: token });
      if (error) throw error;
      localStorage.removeItem("pending_pax_invite");
      invalidateRoles(user?.id);
      setActiveRole("passageiro");
      setDone(true);
      const reservaId = data as unknown as string;
      setTimeout(() => navigate({ to: "/passageiro/reserva/$id", params: { id: reservaId }, replace: true }), 1000);
    } catch (err: any) {
      const msg = err.message ?? "";
      if (msg.includes("invalid_or_used_token")) setError("Convite inválido ou já utilizado.");
      else if (msg.includes("not_authenticated")) setError("Faça login primeiro.");
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
          <div className="size-12 rounded-2xl bg-gradient-to-br from-neon-pink to-neon-purple grid place-items-center mb-4 glow-primary">
            <Ticket className="size-6" />
          </div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-neon-pink mb-1">SUA RESERVA</p>
          <h1 className="font-display text-2xl font-bold mb-1">{invite.excursao_titulo}</h1>
          <p className="text-sm text-muted-foreground mb-1">
            {invite.excursao_destino} · {new Date(invite.excursao_data).toLocaleDateString("pt-BR")}
          </p>
          <p className="text-sm mb-5">Reserva no nome de <span className="font-bold">{invite.nome}</span>.</p>

          {invite.ja_usado ? (
            <Msg tone="error" icon={AlertCircle}>Este convite já foi utilizado.</Msg>
          ) : done ? (
            <Msg tone="success" icon={CheckCircle2}>Reserva vinculada! Abrindo…</Msg>
          ) : !user ? (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                Faça login ou crie sua conta para acessar sua reserva.
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
                Aceitar e abrir reserva
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
