import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Trash2, LinkIcon, Copy, Check, Crown, Handshake } from "lucide-react";

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

/**
 * Gestão de SÓCIOS (co-organizadores) embutida no contexto da excursão.
 * Renderiza apenas para o excursionista raiz (organizer_id === user.id).
 * Não existe como página isolada — sempre vinculada à excursão atual.
 */
export function SociosSection({ excursaoId }: { excursaoId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const { data: invites = [], isLoading: invLoading } = useQuery({
    queryKey: ["invites-socios", excursaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("id, token, papel, expires_at, used, created_at")
        .eq("excursao_id", excursaoId)
        .eq("papel", "coorganizador")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invite[];
    },
    enabled: open,
    staleTime: 30_000,
  });

  const { data: socios = [] } = useQuery({
    queryKey: ["socios", excursaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipe_excursoes")
        .select("id, staff_user_id, convite_email, status")
        .eq("excursao_id", excursaoId)
        .eq("papel", "coorganizador")
        .eq("status", "ativo");
      if (error) throw error;
      return (data ?? []) as Socio[];
    },
    enabled: open,
    staleTime: 30_000,
  });

  async function gerarLink() {
    setError(null);
    setBusy(true);
    try {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("invitations")
        .insert({ excursao_id: excursaoId, papel: "coorganizador", created_by: user.id });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["invites-socios", excursaoId] });
    } catch (err: any) {
      setError(err.message ?? "Erro ao gerar link");
    } finally {
      setBusy(false);
    }
  }

  async function revogar(invId: string) {
    if (!confirm("Revogar este convite?")) return;
    await supabase.from("invitations").delete().eq("id", invId);
    qc.invalidateQueries({ queryKey: ["invites-socios", excursaoId] });
  }

  async function removerSocio(mId: string) {
    if (!confirm("Remover este sócio? Ele perderá o acesso à excursão.")) return;
    await supabase.from("equipe_excursoes").delete().eq("id", mId);
    qc.invalidateQueries({ queryKey: ["socios", excursaoId] });
  }

  function copiar(token: string, invId: string) {
    const url = `${window.location.origin}/invite/staff/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(invId);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="glass rounded-2xl overflow-hidden border border-neon-pink/20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-pink to-neon-purple grid place-items-center shrink-0">
          <Handshake className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Sócios desta excursão</p>
          <p className="text-[11px] text-muted-foreground">
            {socios.length > 0 ? `${socios.length} ativo(s)` : "Co-organizadores com acesso total"}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-border/40">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Crown className="h-4 w-4 text-neon-pink shrink-0 mt-0.5" />
            <p>
              <span className="font-semibold text-foreground">Você é o excursionista raiz.</span>{" "}
              Sócios não podem transferir a excursão, gerar novos convites de sócio nem alterar o link principal.
            </p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={gerarLink}
            disabled={busy}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-primary-foreground font-semibold glow-primary hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
            Gerar link de convite de sócio
          </button>

          <div>
            <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
              Convites ({invites.length})
            </h3>
            {invLoading ? (
              <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
            ) : invites.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum convite gerado ainda.</p>
            ) : (
              <ul className="space-y-2">
                {invites.map((inv) => {
                  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/staff/${inv.token}`;
                  const expirado = new Date(inv.expires_at) < new Date();
                  const status = inv.used ? "usado" : expirado ? "expirado" : "ativo";
                  const cor = inv.used ? "text-neon-green" : expirado ? "text-red-400" : "text-yellow-300";
                  return (
                    <li key={inv.id} className="rounded-xl bg-secondary/30 p-2.5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] uppercase tracking-wider ${cor}`}>{status}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          expira {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 truncate text-[10px] bg-background/40 rounded-lg px-2 py-1.5 text-muted-foreground">{url}</code>
                        <button
                          onClick={() => copiar(inv.token, inv.id)}
                          disabled={inv.used || expirado}
                          className="size-8 grid place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
                          aria-label="Copiar"
                        >
                          {copiedId === inv.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => revogar(inv.id)}
                          className="size-8 grid place-items-center rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10"
                          aria-label="Revogar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
              Sócios ativos ({socios.length})
            </h3>
            {socios.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum sócio vinculado ainda.</p>
            ) : (
              <ul className="space-y-2">
                {socios.map((m) => (
                  <li key={m.id} className="rounded-xl bg-secondary/30 p-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-neon-pink to-neon-purple grid place-items-center">
                      <Handshake className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs truncate">Sócio</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {m.convite_email ?? `ID ${m.staff_user_id?.slice(0, 8)}`}
                      </p>
                    </div>
                    <button
                      onClick={() => removerSocio(m.id)}
                      className="size-8 grid place-items-center rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
