import { createFileRoute, Link, useParams, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Loader2, Trash2, LinkIcon, Copy, Check, Crown, Handshake } from "lucide-react";

export const Route = createFileRoute("/app/excursao/$id/socios")({
  component: SociosPage,
});

type Invite = {
  id: string;
  token: string;
  papel: string;
  expires_at: string;
  used: boolean;
  created_at: string;
};

type Socio = {
  id: string;
  staff_user_id: string | null;
  convite_email: string | null;
  status: string;
};

function SociosPage() {
  const { id } = useParams({ from: "/app/excursao/$id/socios" });
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Apenas o dono raiz pode gerenciar sócios.
  const { data: excursao, isLoading: exLoading } = useQuery({
    queryKey: ["excursao-owner", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("excursoes")
        .select("id, organizer_id, titulo")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const { data: invites = [], isLoading: invLoading } = useQuery({
    queryKey: ["invites-socios", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("id, token, papel, expires_at, used, created_at")
        .eq("excursao_id", id)
        .eq("papel", "coorganizador")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invite[];
    },
    staleTime: 30_000,
  });

  const { data: socios = [] } = useQuery({
    queryKey: ["socios", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipe_excursoes")
        .select("id, staff_user_id, convite_email, status")
        .eq("excursao_id", id)
        .eq("papel", "coorganizador")
        .eq("status", "ativo");
      if (error) throw error;
      return (data ?? []) as Socio[];
    },
    staleTime: 30_000,
  });

  if (exLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }
  if (!excursao) return <Navigate to="/app" />;
  if (excursao.organizer_id !== user?.id) {
    return (
      <div>
        <Link to="/app/excursao/$id" params={{ id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Apenas o excursionista raiz pode convidar sócios.
        </div>
      </div>
    );
  }

  async function gerarLink() {
    setError(null);
    setBusy(true);
    try {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("invitations")
        .insert({ excursao_id: id, papel: "coorganizador", created_by: user.id });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["invites-socios", id] });
    } catch (err: any) {
      setError(err.message ?? "Erro ao gerar link");
    } finally {
      setBusy(false);
    }
  }

  async function revogar(invId: string) {
    if (!confirm("Revogar este convite?")) return;
    await supabase.from("invitations").delete().eq("id", invId);
    qc.invalidateQueries({ queryKey: ["invites-socios", id] });
  }

  async function removerSocio(mId: string) {
    if (!confirm("Remover este sócio? Ele perderá o acesso à excursão.")) return;
    await supabase.from("equipe_excursoes").delete().eq("id", mId);
    qc.invalidateQueries({ queryKey: ["socios", id] });
  }

  function copiar(token: string, invId: string) {
    const url = `${window.location.origin}/invite/staff/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(invId);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div>
      <Link to="/app/excursao/$id" params={{ id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="flex items-center gap-2 mb-1">
        <Handshake className="h-5 w-5 text-neon-pink" />
        <h1 className="font-display text-2xl font-bold">Sócios da excursão</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Sócios têm acesso total para gerenciar e editar esta excursão junto com você.
      </p>

      <div className="glass rounded-2xl p-4 mb-6 border border-neon-pink/20">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Crown className="h-4 w-4 text-neon-pink shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold text-foreground">Você é o excursionista raiz.</span> Sócios não podem transferir a excursão nem alterar o link principal — essas ações são exclusivas suas.
          </p>
        </div>
      </div>

      <div className="glass rounded-3xl p-5 mb-6 space-y-3">
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          onClick={gerarLink}
          disabled={busy}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-primary-foreground font-semibold glow-primary hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
          Gerar link de convite de sócio
        </button>
      </div>

      <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
        <LinkIcon className="h-3.5 w-3.5" /> Convites ({invites.length})
      </h2>
      {invLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : invites.length === 0 ? (
        <p className="glass rounded-2xl p-5 text-center text-sm text-muted-foreground mb-6">
          Nenhum convite de sócio gerado ainda.
        </p>
      ) : (
        <ul className="space-y-2 mb-6">
          {invites.map((inv) => {
            const url = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/staff/${inv.token}`;
            const expirado = new Date(inv.expires_at) < new Date();
            const status = inv.used ? "usado" : expirado ? "expirado" : "ativo";
            const cor = inv.used ? "text-neon-green" : expirado ? "text-red-400" : "text-yellow-300";
            return (
              <li key={inv.id} className="glass rounded-2xl p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold">Sócio (co-organizador)</span>
                  <span className={`text-[10px] uppercase tracking-wider ${cor}`}>{status}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    expira {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate text-[11px] bg-secondary/40 rounded-lg px-2.5 py-2 text-muted-foreground">{url}</code>
                  <button
                    onClick={() => copiar(inv.token, inv.id)}
                    disabled={inv.used || expirado}
                    className="size-9 grid place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
                    aria-label="Copiar"
                  >
                    {copiedId === inv.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => revogar(inv.id)}
                    className="size-9 grid place-items-center rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10"
                    aria-label="Revogar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
        <Handshake className="h-3.5 w-3.5" /> Sócios ativos ({socios.length})
      </h2>
      {socios.length === 0 ? (
        <p className="glass rounded-2xl p-5 text-center text-sm text-muted-foreground">
          Nenhum sócio vinculado ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {socios.map((m) => (
            <li key={m.id} className="glass rounded-2xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-pink to-neon-purple grid place-items-center">
                <Handshake className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">Sócio</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {m.convite_email ?? `ID ${m.staff_user_id?.slice(0, 8)}`}
                </p>
              </div>
              <button
                onClick={() => removerSocio(m.id)}
                className="size-9 grid place-items-center rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10"
                aria-label="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
