import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Trash2, LinkIcon, Copy, Check, ShieldCheck, Users } from "lucide-react";

export const Route = createFileRoute("/app/excursao/$id/equipe")({
  component: EquipePage,
});

const PAPEIS = [
  { value: "apoio", label: "Apoio" },
  { value: "motorista", label: "Motorista" },
  { value: "seguranca", label: "Segurança" },
  { value: "coordenador", label: "Coordenador" },
];

type Invite = {
  id: string;
  token: string;
  papel: string;
  expires_at: string;
  used: boolean;
  created_at: string;
};

type Membro = {
  id: string;
  staff_user_id: string | null;
  papel: string;
  status: string;
};

function EquipePage() {
  const { id } = useParams({ from: "/app/excursao/$id/equipe" });
  const qc = useQueryClient();
  const [papel, setPapel] = useState("apoio");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: invites = [], isLoading: invLoading } = useQuery({
    queryKey: ["invites", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("id, token, papel, expires_at, used, created_at")
        .eq("excursao_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invite[];
    },
  });

  const { data: equipe = [] } = useQuery({
    queryKey: ["equipe", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipe_excursoes")
        .select("id, staff_user_id, papel, status")
        .eq("excursao_id", id)
        .eq("status", "ativo");
      if (error) throw error;
      return (data ?? []) as Membro[];
    },
  });

  async function gerarLink() {
    setError(null);
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("invitations")
        .insert({ excursao_id: id, papel, created_by: u.user.id });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["invites", id] });
    } catch (err: any) {
      setError(err.message ?? "Erro ao gerar link");
    } finally {
      setBusy(false);
    }
  }

  async function revogar(invId: string) {
    if (!confirm("Revogar este convite?")) return;
    await supabase.from("invitations").delete().eq("id", invId);
    qc.invalidateQueries({ queryKey: ["invites", id] });
  }

  async function removerMembro(mId: string) {
    if (!confirm("Remover este staff da equipe?")) return;
    await supabase.from("equipe_excursoes").delete().eq("id", mId);
    qc.invalidateQueries({ queryKey: ["equipe", id] });
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

      <h1 className="font-display text-2xl font-bold mb-1">Equipe da excursão</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Gere um link único por função e envie ao staff. Ao abrir e fazer login, ele já é vinculado.
      </p>

      <div className="glass rounded-3xl p-5 mb-6 space-y-3">
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground mb-1.5 block">Função</span>
          <select
            value={papel}
            onChange={(e) => setPapel(e.target.value)}
            className="w-full h-11 rounded-xl bg-secondary/40 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition text-sm px-3"
          >
            {PAPEIS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          onClick={gerarLink}
          disabled={busy}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold glow-primary hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
          Gerar link de convite
        </button>
      </div>

      <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
        <LinkIcon className="h-3.5 w-3.5" /> Convites ({invites.length})
      </h2>
      {invLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : invites.length === 0 ? (
        <p className="glass rounded-2xl p-5 text-center text-sm text-muted-foreground mb-6">
          Nenhum convite gerado ainda.
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
                  <span className="text-xs font-semibold capitalize">{PAPEIS.find(p => p.value === inv.papel)?.label ?? inv.papel}</span>
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
        <Users className="h-3.5 w-3.5" /> Staff vinculado ({equipe.length})
      </h2>
      {equipe.length === 0 ? (
        <p className="glass rounded-2xl p-5 text-center text-sm text-muted-foreground">
          Ninguém vinculado ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {equipe.map((m) => (
            <li key={m.id} className="glass rounded-2xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-green to-neon-purple grid place-items-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate capitalize">
                  {PAPEIS.find(p => p.value === m.papel)?.label ?? m.papel}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  ID {m.staff_user_id?.slice(0, 8)}
                </p>
              </div>
              <button
                onClick={() => removerMembro(m.id)}
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
