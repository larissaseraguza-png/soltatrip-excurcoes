import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Mail, Trash2, UserPlus, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/app/excursao/$id/equipe")({
  component: EquipePage,
});

type Membro = {
  id: string;
  staff_user_id: string | null;
  convite_email: string | null;
  papel: string;
  status: string;
  created_at: string;
};

function EquipePage() {
  const { id } = useParams({ from: "/app/excursao/$id/equipe" });
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState("staff");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: equipe = [], isLoading } = useQuery({
    queryKey: ["equipe", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipe_excursoes")
        .select("id, staff_user_id, convite_email, papel, status, created_at")
        .eq("excursao_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Membro[];
    },
  });

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error } = await supabase.from("equipe_excursoes").insert({
        excursao_id: id,
        convite_email: email.trim().toLowerCase(),
        papel,
        status: "pendente",
      });
      if (error) throw error;
      setEmail("");
      qc.invalidateQueries({ queryKey: ["equipe", id] });
    } catch (err: any) {
      setError(err.message ?? "Erro ao convidar staff");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remover este membro da equipe?")) return;
    await supabase.from("equipe_excursoes").delete().eq("id", memberId);
    qc.invalidateQueries({ queryKey: ["equipe", id] });
  }

  return (
    <div>
      <Link to="/app/excursao/$id" params={{ id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <h1 className="font-display text-2xl font-bold mb-1">Equipe da excursão</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Convide staff por e-mail. Quando criarem conta como Staff, o vínculo é ativado automaticamente.
      </p>

      <form onSubmit={handleInvite} className="glass rounded-3xl p-5 mb-6 space-y-3">
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground mb-1.5 block">E-mail do staff</span>
          <input
            type="email"
            required
            placeholder="staff@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 rounded-xl bg-secondary/40 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition text-sm px-3"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground mb-1.5 block">Papel</span>
          <select
            value={papel}
            onChange={(e) => setPapel(e.target.value)}
            className="w-full h-11 rounded-xl bg-secondary/40 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition text-sm px-3"
          >
            <option value="staff">Staff</option>
            <option value="lider">Líder</option>
          </select>
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold glow-primary hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Enviar convite
        </button>
      </form>

      <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Membros ({equipe.length})</h2>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : equipe.length === 0 ? (
        <p className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Nenhum membro ainda. Convide o primeiro acima.
        </p>
      ) : (
        <ul className="space-y-2">
          {equipe.map((m) => (
            <li key={m.id} className="glass rounded-2xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-green to-neon-purple grid place-items-center shrink-0">
                {m.status === "ativo" ? <CheckCircle2 className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {m.convite_email ?? `Usuário ${m.staff_user_id?.slice(0, 8)}`}
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <span className="capitalize">{m.papel}</span>
                  <span>·</span>
                  <span className={`inline-flex items-center gap-1 ${m.status === "ativo" ? "text-neon-green" : "text-yellow-300"}`}>
                    {m.status === "ativo" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {m.status}
                  </span>
                </p>
              </div>
              <button
                onClick={() => handleRemove(m.id)}
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
