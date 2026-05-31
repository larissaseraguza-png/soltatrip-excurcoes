import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import {
  ArrowLeft, Bus, ChevronRight, Loader2, Plus, Pencil, Trash2, Users,
  Clock, MapPin, DollarSign, X, BookMarked, Save,
} from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

export const Route = createFileRoute("/app/excursao/$id/onibus")({
  component: OnibusListPage,
});

type Onibus = {
  id: string;
  nome: string;
  capacidade: number;
  custo: number;
  ordem: number;
  ativo: boolean;
  whatsapp_group_url: string | null;
};

type Embarque = {
  id?: string;
  nome: string;
  endereco: string;
  horario: string;
  ordem: number;
};

type LocalSalvo = {
  id: string;
  nome: string;
  endereco: string | null;
};

function OnibusListPage() {
  const { id } = useParams({ from: "/app/excursao/$id/onibus" });
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Onibus | null>(null);
  const [creating, setCreating] = useState(false);
  const confirmAction = useConfirm();


  const { data: onibus = [], isLoading } = useQuery({
    queryKey: ["onibus", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onibus")
        .select("id, nome, capacidade, custo, ordem, ativo, whatsapp_group_url")
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

  const { data: primeiros = {} } = useQuery({
    queryKey: ["onibus-primeiro-embarque", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pontos_embarque")
        .select("onibus_id, nome, horario, ordem")
        .eq("excursao_id", id)
        .order("ordem", { ascending: true });
      const map: Record<string, { nome: string; horario: string | null }> = {};
      (data ?? []).forEach((p: any) => {
        if (!p.onibus_id) return;
        if (!map[p.onibus_id]) map[p.onibus_id] = { nome: p.nome, horario: p.horario };
      });
      return map;
    },
  });

  useRealtimeSync(
    `onibus-list-${id}`,
    [
      { table: "onibus", filter: `excursao_id=eq.${id}` },
      { table: "passageiros", filter: `excursao_id=eq.${id}` },
      { table: "pontos_embarque", filter: `excursao_id=eq.${id}` },
    ],
    [["onibus", id], ["onibus-ocupacao", id], ["onibus-primeiro-embarque", id]],
  );

  async function recomputeTotalVagas() {
    const { data } = await supabase
      .from("onibus")
      .select("capacidade, ativo")
      .eq("excursao_id", id);
    const total = (data ?? [])
      .filter((o: any) => o.ativo !== false)
      .reduce((sum: number, o: any) => sum + Number(o.capacidade ?? 0), 0);
    await supabase.from("excursoes").update({ total_vagas: total }).eq("id", id);
  }

  async function handleDelete(o: Onibus) {
    const count = ocupacao[o.id] ?? 0;
    if (count > 0) {
      toast.error(`Não é possível excluir: existem ${count} passageiros neste ônibus.`);
      return;
    }
    const ok = await confirmAction({
      title: "Excluir ônibus",
      message: `Deseja excluir o ônibus "${o.nome}"?`,
      details: [
        { label: "Status atual", value: "Sem passageiros vinculados" },
        { label: "Ação", value: "Remove poltronas e pontos de embarque do ônibus" },
      ],
      confirmLabel: "Excluir ônibus",
      destructive: true,
    });
    if (!ok) return;
    try {
      await supabase.from("pontos_embarque").delete().eq("onibus_id", o.id);
      await supabase.from("seats").delete().eq("onibus_id", o.id);
      const { error } = await supabase.from("onibus").delete().eq("id", o.id);
      if (error) throw error;
      await recomputeTotalVagas();
      qc.invalidateQueries({ queryKey: ["onibus", id] });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao excluir.");
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
          <p className="text-xs text-muted-foreground mt-0.5">Cada ônibus tem capacidade, custo, embarques e staff próprios.</p>
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
          <p className="text-xs text-muted-foreground mb-4">Crie o primeiro ônibus para começar a operar.</p>
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
            const primeiro = primeiros[o.id];
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
                        {Number(o.custo) > 0 && (
                          <span className="inline-flex items-center gap-1"><DollarSign className="h-3 w-3" />R$ {Number(o.custo).toFixed(2)}</span>
                        )}
                        {primeiro?.horario && (
                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{primeiro.horario}</span>
                        )}
                        {primeiro?.nome && (
                          <span className="inline-flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{primeiro.nome}</span>
                        )}
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
  const { user } = useAuth();
  const isEdit = !!onibus;

  const [nome, setNome] = useState(onibus?.nome ?? "");
  const [capacidade, setCapacidade] = useState(String(onibus?.capacidade ?? 40));
  const [custo, setCusto] = useState(String(onibus?.custo ?? 0));
  const [ativo, setAtivo] = useState(onibus?.ativo ?? true);
  const [whatsapp, setWhatsapp] = useState(onibus?.whatsapp_group_url ?? "");
  const [embarques, setEmbarques] = useState<Embarque[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carrega embarques do ônibus em edição
  useEffect(() => {
    if (!onibus) {
      setEmbarques([{ nome: "", endereco: "", horario: "", ordem: 0 }]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("pontos_embarque")
        .select("id, nome, endereco, horario, ordem")
        .eq("onibus_id", onibus.id)
        .order("ordem", { ascending: true });
      const list = (data ?? []).map((p: any, i: number) => ({
        id: p.id,
        nome: p.nome ?? "",
        endereco: p.endereco ?? "",
        horario: p.horario ?? "",
        ordem: p.ordem ?? i,
      }));
      setEmbarques(list.length ? list : [{ nome: "", endereco: "", horario: "", ordem: 0 }]);
    })();
  }, [onibus]);

  // Locais salvos do excursionista
  const { data: locais = [] } = useQuery({
    queryKey: ["locais-salvos", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("locais_salvos")
        .select("id, nome, endereco")
        .eq("organizer_id", user.id)
        .order("nome", { ascending: true });
      return (data ?? []) as LocalSalvo[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  function updateEmb(idx: number, patch: Partial<Embarque>) {
    setEmbarques((arr) => arr.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }
  function addEmb() {
    setEmbarques((arr) => [...arr, { nome: "", endereco: "", horario: "", ordem: arr.length }]);
  }
  function removeEmb(idx: number) {
    setEmbarques((arr) => arr.length === 1 ? arr : arr.filter((_, i) => i !== idx).map((e, i) => ({ ...e, ordem: i })));
  }
  function pickLocal(idx: number, localId: string) {
    if (!localId) return;
    const l = locais.find((x) => x.id === localId);
    if (!l) return;
    updateEmb(idx, { nome: l.nome, endereco: l.endereco ?? "" });
  }

  async function salvarLocal(emb: Embarque) {
    if (!user) return;
    if (!emb.nome.trim()) {
      toast.error("Informe o nome do local antes de salvar.");
      return;
    }
    // evita duplicado por nome
    const existente = locais.find((l) => l.nome.toLowerCase() === emb.nome.trim().toLowerCase());
    if (existente) {
      toast.info("Esse local já está salvo.");
      return;
    }
    const { error } = await supabase.from("locais_salvos").insert({
      organizer_id: user.id,
      nome: emb.nome.trim(),
      endereco: emb.endereco.trim() || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["locais-salvos", user.id] });
    toast.success("Local salvo!");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const cap = parseInt(capacidade, 10);
      const cst = Number(custo);
      if (!nome.trim()) throw new Error("Informe o nome do ônibus.");
      if (!Number.isFinite(cap) || cap <= 0) throw new Error("Capacidade inválida.");
      if (!Number.isFinite(cst) || cst < 0) throw new Error("Custo inválido.");

      const embValidos = embarques
        .map((emb, i) => ({ ...emb, ordem: i }))
        .filter((emb) => emb.nome.trim().length > 0);

      const waNorm = (() => {
        const t = whatsapp.trim();
        if (!t) return null;
        return /^https?:\/\//i.test(t) ? t : `https://${t}`;
      })();

      let onibusId: string;

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
            custo: cst,
            ativo,
            whatsapp_group_url: waNorm,
          })
          .eq("id", onibus.id);
        if (upErr) throw upErr;
        onibusId = onibus.id;

        // Garante poltronas 1..cap (idempotente)
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
            custo: cst,
            ativo,
            whatsapp_group_url: waNorm,
            ordem: nextOrdem,
          })
          .select("id")
          .single();
        if (insErr) throw insErr;
        onibusId = novoOnibus!.id;

        const novosSeats = [];
        for (let i = 1; i <= cap; i++) {
          novosSeats.push({ excursao_id: excursaoId, onibus_id: onibusId, seat_number: String(i) });
        }
        if (novosSeats.length) await supabase.from("seats").insert(novosSeats);
      }

      // Sincroniza embarques: deleta removidos, upsert mantidos/novos
      const { data: atuais } = await supabase
        .from("pontos_embarque")
        .select("id")
        .eq("onibus_id", onibusId);
      const mantidosIds = new Set(embValidos.filter((e) => e.id).map((e) => e.id as string));
      const removerIds = (atuais ?? []).map((a: any) => a.id).filter((aid: string) => !mantidosIds.has(aid));
      if (removerIds.length) {
        await supabase.from("pontos_embarque").delete().in("id", removerIds);
      }
      for (const emb of embValidos) {
        if (emb.id) {
          await supabase.from("pontos_embarque").update({
            nome: emb.nome.trim(),
            endereco: emb.endereco.trim() || null,
            horario: emb.horario || null,
            ordem: emb.ordem,
          }).eq("id", emb.id);
        } else {
          await supabase.from("pontos_embarque").insert({
            excursao_id: excursaoId,
            onibus_id: onibusId,
            nome: emb.nome.trim(),
            endereco: emb.endereco.trim() || null,
            horario: emb.horario || null,
            ordem: emb.ordem,
          });
        }
      }

      // Recalcula total_vagas da festa (soma das capacidades de ônibus ativos)
      const { data: todos } = await supabase
        .from("onibus")
        .select("capacidade, ativo")
        .eq("excursao_id", excursaoId);
      const total = (todos ?? [])
        .filter((o: any) => o.ativo !== false)
        .reduce((sum: number, o: any) => sum + Number(o.capacidade ?? 0), 0);
      await supabase.from("excursoes").update({ total_vagas: total }).eq("id", excursaoId);

      qc.invalidateQueries({ queryKey: ["onibus", excursaoId] });
      qc.invalidateQueries({ queryKey: ["onibus-primeiro-embarque", excursaoId] });
      qc.invalidateQueries({ queryKey: ["excursao", excursaoId] });
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
        className="w-full sm:max-w-lg glass rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-black">{isEdit ? "Editar ônibus" : "Novo ônibus"}</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Nome">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Ônibus A"
              className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Capacidade (vagas)">
              <input
                type="number"
                min={1}
                value={capacidade}
                onChange={(e) => setCapacidade(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
                required
              />
            </Field>
            <Field label="Custo do ônibus (R$)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={custo}
                onChange={(e) => setCusto(e.target.value)}
                placeholder="0,00"
                className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
              />
            </Field>
          </div>
          <Field label="Link grupo WhatsApp (opcional)">
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="https://chat.whatsapp.com/..."
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

        {/* Embarques (rota) */}
        <div className="mt-5 pt-5 border-t border-border/40">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold flex items-center gap-1.5"><MapPin className="h-4 w-4 text-neon-pink" /> Embarques (rota)</p>
              <p className="text-[11px] text-muted-foreground">Defina os pontos de parada deste ônibus, em ordem.</p>
            </div>
          </div>

          <div className="space-y-3">
            {embarques.map((emb, idx) => (
              <div key={idx} className="rounded-2xl border border-border bg-background/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neon-pink uppercase tracking-wider">
                    Parada {idx + 1}
                  </span>
                  {embarques.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmb(idx)}
                      className="h-7 w-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center"
                      aria-label="Remover parada"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {locais.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => pickLocal(idx, e.target.value)}
                    className="w-full h-9 px-2 rounded-lg bg-secondary/40 border border-border text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="">Selecionar de locais salvos…</option>
                    {locais.map((l) => (
                      <option key={l.id} value={l.id}>{l.nome}</option>
                    ))}
                  </select>
                )}

                <div className="grid grid-cols-[1fr_110px] gap-2">
                  <input
                    placeholder="Nome do local *"
                    value={emb.nome}
                    onChange={(e) => updateEmb(idx, { nome: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
                  />
                  <input
                    type="time"
                    value={emb.horario}
                    onChange={(e) => updateEmb(idx, { horario: e.target.value })}
                    className="w-full h-10 px-2 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <input
                  placeholder="Endereço"
                  value={emb.endereco}
                  onChange={(e) => updateEmb(idx, { endereco: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => salvarLocal(emb)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-neon-pink hover:text-neon-purple"
                >
                  <BookMarked className="h-3 w-3" /> Salvar local para reutilizar
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addEmb}
            className="mt-3 w-full h-10 rounded-xl border border-dashed border-border text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-primary hover:text-primary transition"
          >
            <Plus className="h-4 w-4" /> Adicionar parada
          </button>
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
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
