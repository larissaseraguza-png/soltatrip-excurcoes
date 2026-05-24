import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { ArrowLeft, Bus, ChevronRight, Loader2, Plus, Pencil, Trash2, Users, Clock, MapPin } from "lucide-react";

export const Route = createFileRoute("/app/excursao/$id/onibus")({
  component: OnibusListPage,
});

type Onibus = {
  id: string;
  nome: string;
  capacidade: number;
  horario_saida: string | null;
  horario_retorno: string | null;
  ponto_partida: string | null;
  ordem: number;
  ativo: boolean;
  whatsapp_group_url: string | null;
};

function OnibusListPage() {
  const { id } = useParams({ from: "/app/excursao/$id/onibus" });
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Onibus | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: onibus = [], isLoading } = useQuery({
    queryKey: ["onibus", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onibus")
        .select("id, nome, capacidade, horario_saida, horario_retorno, ponto_partida, ordem, ativo")
        .eq("excursao_id", id)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Onibus[];
    },
  });

  const { data: ocupacao = {} } = useQuery({
    queryKey: ["onibus-ocupacao", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("passageiros")
        .select("onibus_id, status")
        .eq("excursao_id", id);
      const map: Record<string, number> = {};
      (data ?? []).forEach((p: any) => {
        if (p.status === "cancelado") return;
        const k = p.onibus_id ?? "_sem";
        map[k] = (map[k] ?? 0) + 1;
      });
      return map;
    },
  });

  useRealtimeSync(
    `onibus-list-${id}`,
    [
      { table: "onibus", filter: `excursao_id=eq.${id}` },
      { table: "passageiros", filter: `excursao_id=eq.${id}` },
    ],
    [["onibus", id], ["onibus-ocupacao", id]],
  );

  async function handleDelete(o: Onibus) {
    const count = ocupacao[o.id] ?? 0;
    if (count > 0) {
      alert(`Não é possível excluir: existem ${count} passageiros neste ônibus. Mova-os ou cancele antes.`);
      return;
    }
    if (!confirm(`Excluir o ônibus "${o.nome}"? Poltronas e pontos vinculados serão removidos.`)) return;
    try {
      await supabase.from("pontos_embarque").delete().eq("onibus_id", o.id);
      await supabase.from("seats").delete().eq("onibus_id", o.id);
      const { error } = await supabase.from("onibus").delete().eq("id", o.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["onibus", id] });
    } catch (err: any) {
      alert(err.message ?? "Erro ao excluir.");
    }
  }

  return (
    <div>
      <Link to="/app/excursao/$id" params={{ id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-black">Ônibus</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Cada ônibus tem assentos, embarques e staff próprios.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-xl bg-gradient-to-r from-neon-purple to-neon-pink hover:opacity-90 transition"
        >
          <Plus className="h-4 w-4" /> Novo
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : onibus.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <Bus className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold mb-1">Nenhum ônibus cadastrado</p>
          <p className="text-xs text-muted-foreground mb-4">Crie o primeiro ônibus para começar a vender vagas.</p>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-neon-purple to-neon-pink"
          >
            <Plus className="h-4 w-4" /> Criar ônibus
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {onibus.map((o) => {
            const usados = ocupacao[o.id] ?? 0;
            return (
              <li key={o.id} className="glass rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Link
                    to="/app/excursao/$id/onibus/$onibusId"
                    params={{ id, onibusId: o.id }}
                    className="flex items-start gap-3 flex-1 min-w-0"
                  >
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center shrink-0">
                      <Bus className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{o.nome}</p>
                        {!o.ativo && (
                          <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">Inativo</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                        <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{usados}/{o.capacidade}</span>
                        {o.horario_saida && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{o.horario_saida}</span>}
                        {o.ponto_partida && <span className="inline-flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{o.ponto_partida}</span>}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </Link>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-border/40">
                  <button
                    onClick={() => setEditing(o)}
                    className="flex-1 h-9 rounded-lg border border-border text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-secondary transition"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(o)}
                    className="flex-1 h-9 rounded-lg border border-red-500/30 text-red-400 text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-red-500/10 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {(creating || editing) && (
        <OnibusFormModal
          excursaoId={id}
          onibus={editing}
          nextOrdem={onibus.length}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function OnibusFormModal({
  excursaoId,
  onibus,
  nextOrdem,
  onClose,
}: {
  excursaoId: string;
  onibus: Onibus | null;
  nextOrdem: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [nome, setNome] = useState(onibus?.nome ?? "");
  const [capacidade, setCapacidade] = useState(String(onibus?.capacidade ?? 40));
  const [horarioSaida, setHorarioSaida] = useState(onibus?.horario_saida ?? "");
  const [horarioRetorno, setHorarioRetorno] = useState(onibus?.horario_retorno ?? "");
  const [pontoPartida, setPontoPartida] = useState(onibus?.ponto_partida ?? "");
  const [ativo, setAtivo] = useState(onibus?.ativo ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!onibus;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const cap = parseInt(capacidade, 10);
      if (!nome.trim()) throw new Error("Informe o nome do ônibus.");
      if (!Number.isFinite(cap) || cap <= 0) throw new Error("Capacidade inválida.");

      if (isEdit && onibus) {
        if (cap < onibus.capacidade) {
          if (!confirm("Reduzir a capacidade pode afetar poltronas já criadas. Continuar?")) {
            setBusy(false);
            return;
          }
        }
        const { error: upErr } = await supabase
          .from("onibus")
          .update({
            nome: nome.trim(),
            capacidade: cap,
            horario_saida: horarioSaida || null,
            horario_retorno: horarioRetorno || null,
            ponto_partida: pontoPartida || null,
            ativo,
          })
          .eq("id", onibus.id);
        if (upErr) throw upErr;

        // Garante poltronas 1..cap para o ônibus (idempotente)
        const { data: existentes } = await supabase
          .from("seats")
          .select("seat_number")
          .eq("onibus_id", onibus.id);
        const jaTem = new Set((existentes ?? []).map((s: any) => String(s.seat_number)));
        const faltam: any[] = [];
        for (let i = 1; i <= cap; i++) {
          if (!jaTem.has(String(i))) {
            faltam.push({ excursao_id: excursaoId, onibus_id: onibus.id, seat_number: String(i) });
          }
        }
        if (faltam.length) await supabase.from("seats").insert(faltam);
      } else {
        const { data: novoOnibus, error: insErr } = await supabase
          .from("onibus")
          .insert({
            excursao_id: excursaoId,
            nome: nome.trim(),
            capacidade: cap,
            horario_saida: horarioSaida || null,
            horario_retorno: horarioRetorno || null,
            ponto_partida: pontoPartida || null,
            ativo,
            ordem: nextOrdem,
          })
          .select("id")
          .single();
        if (insErr) throw insErr;

        const novosSeats = [];
        for (let i = 1; i <= cap; i++) {
          novosSeats.push({ excursao_id: excursaoId, onibus_id: novoOnibus!.id, seat_number: String(i) });
        }
        if (novosSeats.length) await supabase.from("seats").insert(novosSeats);
      }

      qc.invalidateQueries({ queryKey: ["onibus", excursaoId] });
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end sm:items-center justify-center p-0 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full sm:max-w-md glass rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="font-display text-xl font-black mb-4">{isEdit ? "Editar ônibus" : "Novo ônibus"}</h2>

        <div className="space-y-3">
          <Field label="Nome">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Ônibus A — Manhã"
              className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
              required
            />
          </Field>
          <Field label="Capacidade (poltronas)">
            <input
              type="number"
              min={1}
              value={capacidade}
              onChange={(e) => setCapacidade(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
              required
              disabled={isEdit}
            />
            {isEdit && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Para aumentar a capacidade, edite e salve. Para reduzir, exclua poltronas manualmente antes.
              </p>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Saída">
              <input
                type="time"
                value={horarioSaida}
                onChange={(e) => setHorarioSaida(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
              />
            </Field>
            <Field label="Retorno">
              <input
                type="time"
                value={horarioRetorno}
                onChange={(e) => setHorarioRetorno(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
              />
            </Field>
          </div>
          <Field label="Ponto de partida (opcional)">
            <input
              value={pontoPartida}
              onChange={(e) => setPontoPartida(e.target.value)}
              placeholder="Ex.: Terminal Central"
              className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="h-4 w-4 accent-neon-pink"
            />
            Ativo (disponível para compra e check-in)
          </label>
        </div>

        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

        <div className="grid grid-cols-2 gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-11 rounded-xl border border-border font-semibold hover:bg-secondary transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="h-11 rounded-xl bg-gradient-to-r from-neon-purple to-neon-pink font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Salvar" : "Criar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
