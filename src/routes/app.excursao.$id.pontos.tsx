import { createFileRoute, Link, useParams, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Loader2, Trash2, MapPin, Clock, Users } from "lucide-react";
import { useState } from "react";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { OnibusFilterBadge } from "@/components/OnibusFilterBadge";
import { useConfirm } from "@/components/ui/confirm-dialog";

export const Route = createFileRoute("/app/excursao/$id/pontos")({
  validateSearch: (search: Record<string, unknown>) => ({
    onibus: typeof search.onibus === "string" ? search.onibus : undefined,
  }),
  component: PontosPage,
});

type Ponto = { id: string; nome: string; endereco: string | null; referencia: string | null; horario: string | null; ordem: number; onibus_id: string | null };

function PontosPage() {
  const { id } = useParams({ from: "/app/excursao/$id/pontos" });
  const { onibus: onibusId } = useSearch({ from: "/app/excursao/$id/pontos" });
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome: "", endereco: "", referencia: "", horario: "" });
  const [saving, setSaving] = useState(false);
  const confirmAction = useConfirm();


  const { data: pontos = [], isLoading } = useQuery({
    queryKey: ["pontos", id, onibusId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("pontos_embarque")
        .select("*")
        .eq("excursao_id", id);
      if (onibusId) q = q.eq("onibus_id", onibusId);
      const { data, error } = await q
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Ponto[];
    },
  });

  const { data: counts = {} } = useQuery({
    queryKey: ["pontos-counts", id, onibusId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("passageiros")
        .select("ponto_embarque_id")
        .eq("excursao_id", id);
      if (onibusId) q = q.eq("onibus_id", onibusId);
      const { data } = await q;
      const map: Record<string, number> = {};
      (data ?? []).forEach((p: any) => {
        if (p.ponto_embarque_id) map[p.ponto_embarque_id] = (map[p.ponto_embarque_id] ?? 0) + 1;
      });
      return map;
    },
  });

  useRealtimeSync(
    `pontos-${id}-${onibusId ?? "all"}`,
    [
      { table: "pontos_embarque", filter: `excursao_id=eq.${id}` },
      { table: "passageiros", filter: `excursao_id=eq.${id}` },
    ],
    [["pontos", id, onibusId ?? "all"], ["pontos-counts", id, onibusId ?? "all"]],
  );

  const removeMut = useMutation({
    mutationFn: async (pid: string) => {
      await supabase.from("pontos_embarque").delete().eq("id", pid);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pontos", id, onibusId ?? "all"] });
      qc.invalidateQueries({ queryKey: ["pontos-counts", id, onibusId ?? "all"] });
    },
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("pontos_embarque").insert({
      excursao_id: id,
      onibus_id: onibusId ?? null,
      nome: form.nome.trim(),
      endereco: form.endereco.trim() || null,
      referencia: form.referencia.trim() || null,
      horario: form.horario.trim() || null,
      ordem: pontos.length,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setForm({ nome: "", endereco: "", referencia: "", horario: "" });
    qc.invalidateQueries({ queryKey: ["pontos", id, onibusId ?? "all"] });
  }

  return (
    <div>
      <Link to="/app/excursao/$id" params={{ id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <h1 className="font-display text-2xl font-black mb-1">Pontos de embarque</h1>
      <p className="text-sm text-muted-foreground mb-5">
        {onibusId
          ? "Pontos vinculados a este ônibus. Passageiros deste ônibus escolherão entre eles."
          : "Cadastre múltiplos locais. O passageiro escolhe onde irá embarcar."}
      </p>

      <OnibusFilterBadge excursaoId={id} onibusId={onibusId} />

      <form onSubmit={add} className="glass rounded-2xl p-4 mb-5 space-y-3">
        <div className="grid grid-cols-[1fr_120px] gap-2">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Nome *</span>
            <input
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Aeroporto, Posto Shell"
              className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border text-sm"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Horário</span>
            <input
              type="time"
              value={form.horario}
              onChange={(e) => setForm({ ...form, horario: e.target.value })}
              className="mt-1 w-full h-11 px-2 rounded-xl bg-input border border-border text-sm"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Endereço</span>
          <input
            value={form.endereco}
            onChange={(e) => setForm({ ...form, endereco: e.target.value })}
            placeholder="Av. Paulista, 1578"
            className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border text-sm"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Referência</span>
          <input
            value={form.referencia}
            onChange={(e) => setForm({ ...form, referencia: e.target.value })}
            placeholder="Próximo ao metrô (opcional)"
            className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border text-sm"
          />
        </label>
        <button
          disabled={saving || !form.nome.trim()}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-primary-foreground font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {saving ? "Salvando..." : "Adicionar ponto"}
        </button>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : pontos.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Nenhum ponto cadastrado ainda.
        </div>
      ) : (
        <ul className="space-y-2">
          {pontos.map((p) => (
            <li key={p.id} className="glass rounded-2xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{p.nome}</p>
                {p.endereco && <p className="text-xs text-muted-foreground truncate">{p.endereco}</p>}
                {p.referencia && <p className="text-[11px] text-muted-foreground/80 truncate italic">{p.referencia}</p>}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  {p.horario && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{p.horario}</span>}
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{counts[p.id] ?? 0} pax</span>
                  {!onibusId && !p.onibus_id && (
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">geral</span>
                  )}
                </div>
              </div>
              <button
                onClick={async () => {
                  const ok = await confirmAction({
                    title: "Remover ponto de embarque",
                    message: `Deseja remover o ponto "${p.nome}"?`,
                    confirmLabel: "Remover",
                    destructive: true,
                  });
                  if (ok) removeMut.mutate(p.id);
                }}
                className="h-8 w-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center"
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
