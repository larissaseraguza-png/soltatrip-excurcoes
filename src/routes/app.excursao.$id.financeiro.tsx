import { createFileRoute, Link, useParams, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Loader2, CheckCircle2, Clock, TrendingUp, Bus, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { OnibusFilterBadge } from "@/components/OnibusFilterBadge";

export const Route = createFileRoute("/app/excursao/$id/financeiro")({
  validateSearch: (search: Record<string, unknown>) => ({
    onibus: typeof search.onibus === "string" ? search.onibus : undefined,
  }),
  component: FinanceiroPage,
});

type Pagamento = {
  id: string;
  valor: number;
  metodo: string;
  status: string;
  observacao: string | null;
  passageiro_id: string;
  onibus_id: string | null;
  pago_em: string | null;
  created_at: string;
};

type PassageiroLite = { id: string; nome: string; onibus_id: string | null };

function FinanceiroPage() {
  const { id } = useParams({ from: "/app/excursao/$id/financeiro" });
  const { onibus: onibusId } = useSearch({ from: "/app/excursao/$id/financeiro" });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: excursao } = useQuery({
    queryKey: ["excursao", id],
    queryFn: async () => (await supabase.from("excursoes").select("titulo,preco,total_vagas,custo_onibus").eq("id", id).single()).data,
  });

  const { data: passageiros = [] } = useQuery({
    queryKey: ["passageiros-lite", id, onibusId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("passageiros").select("id,nome,onibus_id").eq("excursao_id", id);
      if (onibusId) q = q.eq("onibus_id", onibusId);
      const { data } = await q.order("nome");
      return (data ?? []) as PassageiroLite[];
    },
  });

  const { data: pagamentos = [], isLoading } = useQuery({
    queryKey: ["pagamentos", id, onibusId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("pagamentos").select("*").eq("excursao_id", id);
      if (onibusId) q = q.eq("onibus_id", onibusId);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return data as Pagamento[];
    },
  });

  useRealtimeSync(
    `financeiro-${id}-${onibusId ?? "all"}`,
    [
      { table: "pagamentos", filter: `excursao_id=eq.${id}` },
      { table: "passageiros", filter: `excursao_id=eq.${id}` },
    ],
    [["pagamentos", id, onibusId ?? "all"], ["passageiros-lite", id, onibusId ?? "all"]],
  );

  const updateStatus = useMutation({
    mutationFn: async ({ pid, status }: { pid: string; status: string }) => {
      await supabase
        .from("pagamentos")
        .update({ status, pago_em: status === "pago" ? new Date().toISOString() : null })
        .eq("id", pid);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pagamentos", id, onibusId ?? "all"] }),
  });

  const total = pagamentos.reduce((s, p) => (p.status === "pago" ? s + Number(p.valor) : s), 0);
  const pendente = pagamentos.reduce((s, p) => (p.status === "pendente" ? s + Number(p.valor) : s), 0);
  const custoOnibus = Number(excursao?.custo_onibus ?? 0);
  const lucro = total - custoOnibus;
  const nomeMap = new Map(passageiros.map((p) => [p.id, p.nome] as const));

  return (
    <div>
      <Link to="/app/excursao/$id" params={{ id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{excursao?.titulo ?? "Excursão"}</p>
          <h1 className="font-display text-2xl font-black">Financeiro</h1>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-primary-foreground font-bold text-sm glow-primary"
        >
          <Plus className="h-4 w-4" /> Lançar
        </button>
      </div>

      <OnibusFilterBadge excursaoId={id} onibusId={onibusId} />

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Stat icon={CheckCircle2} label="Receita" value={`R$ ${total.toFixed(0)}`} color="text-neon-green" />
        <Stat icon={Bus} label="Despesas" value={`R$ ${custoOnibus.toFixed(0)}`} color="text-red-400" />
        <Stat icon={TrendingUp} label="Lucro" value={`R$ ${lucro.toFixed(0)}`} color={lucro >= 0 ? "text-neon-pink" : "text-red-400"} />
      </div>

      <div className="glass rounded-2xl p-3 mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-yellow-400" />
        <span className="text-xs text-muted-foreground">A receber:</span>
        <span className="text-sm font-bold ml-auto">R$ {pendente.toFixed(2)}</span>
      </div>

      {!onibusId && <CustoOnibusEditor excursaoId={id} valorAtual={custoOnibus} />}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : pagamentos.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Nenhum lançamento ainda.
        </div>
      ) : (
        <ul className="space-y-2">
          {pagamentos.map((p) => (
            <li key={p.id} className="glass rounded-2xl p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{nomeMap.get(p.passageiro_id) ?? "—"}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{p.metodo}</p>
              </div>
              <p className="font-display font-black text-lg">R$ {Number(p.valor).toFixed(2)}</p>
              <select
                value={p.status}
                onChange={(e) => updateStatus.mutate({ pid: p.id, status: e.target.value })}
                className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-secondary border border-border ${
                  p.status === "pago" ? "text-neon-green" : p.status === "estornado" ? "text-red-400" : "text-yellow-400"
                }`}
              >
                <option value="pendente">pendente</option>
                <option value="pago">pago</option>
                <option value="estornado">estornado</option>
              </select>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <NewPagamentoModal
          excursaoId={id}
          onibusId={onibusId ?? null}
          passageiros={passageiros}
          precoSugerido={Number(excursao?.preco ?? 0)}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="glass rounded-2xl p-3">
      <Icon className={`h-4 w-4 ${color} mb-1.5`} />
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
      <p className="font-display font-black text-base mt-0.5">{value}</p>
    </div>
  );
}

function NewPagamentoModal({
  excursaoId,
  onibusId,
  passageiros,
  precoSugerido,
  onClose,
}: {
  excursaoId: string;
  onibusId: string | null;
  passageiros: PassageiroLite[];
  precoSugerido: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    passageiro_id: passageiros[0]?.id ?? "",
    valor: String(precoSugerido),
    metodo: "pix",
    status: "pendente",
    observacao: "",
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.passageiro_id) { alert("Cadastre um passageiro primeiro."); return; }
    setSaving(true);
    // Resolve onibus_id from the selected passenger if not enforced by URL filter
    const selected = passageiros.find((p) => p.id === form.passageiro_id);
    const targetOnibus = onibusId ?? selected?.onibus_id ?? null;
    const { error } = await supabase.from("pagamentos").insert({
      excursao_id: excursaoId,
      onibus_id: targetOnibus,
      passageiro_id: form.passageiro_id,
      valor: Number(form.valor),
      metodo: form.metodo,
      status: form.status,
      observacao: form.observacao || null,
      pago_em: form.status === "pago" ? new Date().toISOString() : null,
    });
    setSaving(false);
    if (error) { alert(error.message); return; }
    qc.invalidateQueries({ queryKey: ["pagamentos", excursaoId, onibusId ?? "all"] });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-3xl p-6 w-full max-w-md border border-border"
      >
        <h2 className="font-display text-xl font-black mb-4">Novo lançamento</h2>
        <div className="space-y-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Passageiro</span>
            <select
              required
              value={form.passageiro_id}
              onChange={(e) => setForm({ ...form, passageiro_id: e.target.value })}
              className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border text-sm"
            >
              {passageiros.length === 0 && <option value="">— sem passageiros —</option>}
              {passageiros.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Valor</span>
              <input
                required
                type="number"
                step="0.01"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Método</span>
              <select
                value={form.metodo}
                onChange={(e) => setForm({ ...form, metodo: e.target.value })}
                className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border text-sm"
              >
                <option value="pix">PIX</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
                <option value="transferencia">Transferência</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Status</span>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border text-sm"
            >
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Observação</span>
            <input
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border text-sm"
            />
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl bg-secondary font-semibold">Cancelar</button>
          <button disabled={saving} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-primary-foreground font-bold disabled:opacity-50">
            {saving ? "Salvando..." : "Lançar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CustoOnibusEditor({ excursaoId, valorAtual }: { excursaoId: string; valorAtual: number }) {
  const qc = useQueryClient();
  const [valor, setValor] = useState(String(valorAtual));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setValor(String(valorAtual)); }, [valorAtual]);

  const dirty = Number(valor || 0) !== valorAtual;

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("excursoes").update({ custo_onibus: Number(valor || 0) }).eq("id", excursaoId);
    setSaving(false);
    if (error) { alert(error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    qc.invalidateQueries({ queryKey: ["excursao", excursaoId] });
  }

  return (
    <div className="glass rounded-2xl p-4 mb-5">
      <div className="flex items-center gap-2 mb-2">
        <Bus className="h-4 w-4 text-neon-pink" />
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Custo do ônibus / transporte</p>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 h-11 px-3 rounded-xl bg-input border border-border">
          <span className="text-sm text-muted-foreground">R$</span>
          <input
            type="number"
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            placeholder="0,00"
          />
        </div>
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="h-11 px-4 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-primary-foreground font-bold text-sm disabled:opacity-40 inline-flex items-center gap-1.5"
        >
          {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "..." : saved ? "Salvo" : "Salvar"}
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">Despesa total com transporte. Entra no cálculo do lucro líquido.</p>
    </div>
  );
}
