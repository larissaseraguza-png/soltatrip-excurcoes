import { createFileRoute, Link, useParams, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Plus, Loader2, CheckCircle2, Clock, TrendingUp, Bus, Save,
  Ticket, Package, User, Phone, Mail, MapPin, Armchair, Send, ChevronDown, ChevronUp,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { OnibusFilterBadge } from "@/components/OnibusFilterBadge";
import { useConfirm } from "@/components/ui/confirm-dialog";
// emitSync removido — não há mais auto-confirmação que precise sincronizar.
// notify removido — pagamentos disparam notificações via trigger DB (payment.approved → passageiro).

export const Route = createFileRoute("/app/excursao/$id/financeiro")({
  validateSearch: (search: Record<string, unknown>) => ({
    onibus: typeof search.onibus === "string" ? search.onibus : undefined,
  }),
  component: FinanceiroPage,
});

type Pagamento = {
  id: string; valor: number; metodo: string; status: string;
  observacao: string | null; passageiro_id: string | null; reserva_id: string | null; onibus_id: string | null;
  pago_em: string | null; created_at: string;
};

type Passageiro = {
  id: string; nome: string; telefone: string | null; email: string | null;
  reserva_id: string | null;
  onibus_id: string | null; seat_id: string | null; assento: string | null;
  ponto_embarque_id: string | null; status: string; payment_status: string;
  total_price: number; amount_paid: number; embarcado_em: string | null;
};

type ExcursaoItem = {
  id: string; nome: string; tipo: string; valor: number; inclui_excursao: boolean;
};

type PedidoItem = {
  id: string; passageiro_id: string | null; comprador_id: string;
  item_id: string; quantidade: number; valor_unitario: number; valor_total: number;
  status: string; emitido_em: string | null; enviado_em: string | null;
  recebido_em: string | null; nao_recebido_em: string | null;
  observacao: string | null; created_at: string;
};

type Onibus = { id: string; nome: string };
type Ponto = { id: string; nome: string };

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function FinanceiroPage() {
  const { id } = useParams({ from: "/app/excursao/$id/financeiro" });
  const { onibus: onibusId } = useSearch({ from: "/app/excursao/$id/financeiro" });
  const qc = useQueryClient();
  const confirmAction = useConfirm();
  const [open, setOpen] = useState(false);
  const [preselectedPaxId, setPreselectedPaxId] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<"all" | "todo">("all");

  const { data: excursao } = useQuery({
    queryKey: ["excursao", id],
    queryFn: async () =>
      (await supabase.from("excursoes").select("titulo,preco,total_vagas,custo_onibus").eq("id", id).single()).data,
  });

  const { data: passageiros = [] } = useQuery({
    queryKey: ["fin-passageiros", id, onibusId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("passageiros")
        .select(
          "id,nome,telefone,email,reserva_id,onibus_id,seat_id,assento,ponto_embarque_id,status,payment_status,total_price,amount_paid,embarcado_em",
        )
        .eq("excursao_id", id);
      if (onibusId) q = q.eq("onibus_id", onibusId);
      const { data } = await q.order("nome");
      return (data ?? []) as Passageiro[];
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

  const { data: itens = [] } = useQuery({
    queryKey: ["fin-itens", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("excursao_itens")
        .select("id,nome,tipo,valor,inclui_excursao")
        .eq("excursao_id", id);
      return (data ?? []) as ExcursaoItem[];
    },
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ["fin-pedidos", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pedidos_itens")
        .select(
          "id,passageiro_id,comprador_id,item_id,quantidade,valor_unitario,valor_total,status,emitido_em,enviado_em,recebido_em,nao_recebido_em,observacao,created_at",
        )
        .eq("excursao_id", id)
        .order("created_at", { ascending: false });
      return (data ?? []) as PedidoItem[];
    },
  });

  const { data: onibusList = [] } = useQuery({
    queryKey: ["fin-onibus", id],
    queryFn: async () => {
      const { data } = await supabase.from("onibus").select("id,nome").eq("excursao_id", id);
      return (data ?? []) as Onibus[];
    },
  });

  const { data: pontos = [] } = useQuery({
    queryKey: ["fin-pontos", id],
    queryFn: async () => {
      const { data } = await supabase.from("pontos_embarque").select("id,nome").eq("excursao_id", id);
      return (data ?? []) as Ponto[];
    },
  });

  useRealtimeSync(
    `financeiro-${id}-${onibusId ?? "all"}`,
    [
      { table: "pagamentos", filter: `excursao_id=eq.${id}` },
      { table: "passageiros", filter: `excursao_id=eq.${id}` },
      { table: "pedidos_itens", filter: `excursao_id=eq.${id}` },
      { table: "excursao_itens", filter: `excursao_id=eq.${id}` },
    ],
    [
      ["pagamentos", id, onibusId ?? "all"],
      ["fin-passageiros", id, onibusId ?? "all"],
      ["fin-pedidos", id],
      ["fin-itens", id],
    ],
  );

  const itemById = useMemo(() => new Map(itens.map((i) => [i.id, i])), [itens]);
  const onibusById = useMemo(() => new Map(onibusList.map((o) => [o.id, o])), [onibusList]);
  const pontoById = useMemo(() => new Map(pontos.map((p) => [p.id, p])), [pontos]);

  // Group pedidos by buyer/passageiro
  const pedidosByPax = useMemo(() => {
    const m = new Map<string, PedidoItem[]>();
    for (const ped of pedidos) {
      const key = ped.passageiro_id ?? `buyer:${ped.comprador_id}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(ped);
    }
    return m;
  }, [pedidos]);

  // Build operational rows: every passageiro + every buyer-only pedido without passageiro
  type Row = {
    key: string;
    passageiro: Passageiro | null;
    nome: string;
    telefone: string | null;
    email: string | null;
    pedidos: PedidoItem[];
    hasExcursao: boolean;
  };

  const rows: Row[] = useMemo(() => {
    const list: Row[] = passageiros.map((p) => ({
      key: p.id,
      passageiro: p,
      nome: p.nome,
      telefone: p.telefone,
      email: p.email,
      pedidos: pedidosByPax.get(p.id) ?? [],
      hasExcursao: true,
    }));
    // Orphan pedidos (no passageiro linked)
    for (const [k, peds] of pedidosByPax.entries()) {
      if (k.startsWith("buyer:")) {
        list.push({
          key: k, passageiro: null,
          nome: "Comprador externo",
          telefone: null, email: null,
          pedidos: peds, hasExcursao: false,
        });
      }
    }
    return list;
  }, [passageiros, pedidosByPax]);

  const totalRecebido = pagamentos.reduce(
    (s, p) => (p.status === "pago" || p.status === "confirmado" ? s + Number(p.valor) : s),
    0,
  );
  const pendente = passageiros.reduce(
    (s, p) => s + Math.max(0, Number(p.total_price) - Number(p.amount_paid)),
    0,
  );
  const custoOnibus = Number(excursao?.custo_onibus ?? 0);
  const lucro = totalRecebido - custoOnibus;

  const todoCount = rows.filter((r) => needsAction(r)).length;
  const visibleRows = filterAction === "todo" ? rows.filter(needsAction) : rows;

  const pendingPaymentFor = (pax: Passageiro | null) => {
    if (!pax) return undefined;
    return pagamentos.find(
      (p) =>
        p.status === "pendente" &&
        (p.passageiro_id === pax.id || (!!pax.reserva_id && p.reserva_id === pax.reserva_id)),
    );
  };

  const confirmarPagamento = useMutation({
    mutationFn: async (pagamento: Pagamento) => {
      const ok = await confirmAction({
        title: "Confirmar pagamento",
        message: "Deseja confirmar este pagamento enviado pelo passageiro?",
        details: [
          { label: "Valor", value: brl(Number(pagamento.valor)) },
          { label: "Método", value: pagamento.metodo.toUpperCase() },
          { label: "Ação", value: "Somar ao valor pago da reserva" },
        ],
        confirmLabel: "Confirmar pagamento",
        destructive: false,
      });
      if (!ok) return false;
      const { error } = await supabase
        .from("pagamentos")
        .update({ status: "confirmado", pago_em: new Date().toISOString() })
        .eq("id", pagamento.id)
        .eq("status", "pendente");
      if (error) throw error;
      return true;
    },
    onSuccess: (updated) => {
      if (!updated) return;
      toast.success("Pagamento confirmado.");
      qc.invalidateQueries({ queryKey: ["pagamentos", id, onibusId ?? "all"] });
      qc.invalidateQueries({ queryKey: ["fin-passageiros", id, onibusId ?? "all"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao confirmar pagamento."),
  });

  const marcarEnviado = useMutation({
    mutationFn: async (pedido: PedidoItem) => {
      const { error } = await supabase
        .from("pedidos_itens")
        .update({ status: "enviado", enviado_em: new Date().toISOString(), emitido_em: pedido.emitido_em ?? new Date().toISOString() })
        .eq("id", pedido.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ingresso marcado como enviado.");
      qc.invalidateQueries({ queryKey: ["fin-pedidos", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro."),
  });

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
        <Stat icon={CheckCircle2} label="Receita" value={brl(totalRecebido)} color="text-neon-green" />
        <Stat icon={Bus} label="Despesas" value={brl(custoOnibus)} color="text-red-400" />
        <Stat icon={TrendingUp} label="Lucro" value={brl(lucro)} color={lucro >= 0 ? "text-neon-pink" : "text-red-400"} />
      </div>

      <div className="glass rounded-2xl p-3 mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-yellow-400" />
        <span className="text-xs text-muted-foreground">A receber:</span>
        <span className="text-sm font-bold ml-auto">{brl(pendente)}</span>
      </div>

      {!onibusId && <CustoOnibusEditor excursaoId={id} valorAtual={custoOnibus} />}

      <div className="flex items-center justify-between mb-3 mt-5">
        <h2 className="font-display font-black text-base">Pedidos</h2>
        <div className="flex gap-1 text-[11px]">
          <button
            onClick={() => setFilterAction("all")}
            className={`px-3 py-1.5 rounded-full font-bold uppercase tracking-wider ${
              filterAction === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >Todos ({rows.length})</button>
          <button
            onClick={() => setFilterAction("todo")}
            className={`px-3 py-1.5 rounded-full font-bold uppercase tracking-wider ${
              filterAction === "todo" ? "bg-yellow-500 text-black" : "bg-secondary text-muted-foreground"
            }`}
          >Ação ({todoCount})</button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : visibleRows.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          {filterAction === "todo" ? "Nada pendente — tudo em dia!" : "Nenhum pedido ainda."}
        </div>
      ) : (
        <ul className="space-y-3">
          {visibleRows.map((r) => (
            <PedidoCard
              key={r.key}
              row={r}
              itemById={itemById}
              onibusById={onibusById}
              pontoById={pontoById}
              pendingPayment={pendingPaymentFor(r.passageiro)}
              onConfirmar={(p) => confirmarPagamento.mutate(p)}
              onMarcarEnviado={(p) => marcarEnviado.mutate(p)}
              confirmandoId={confirmarPagamento.isPending ? confirmarPagamento.variables?.id : undefined}
            />
          ))}
        </ul>
      )}

      {pagamentos.length > 0 && (
        <PagamentosDetalhe
          pagamentos={pagamentos}
          passageiros={passageiros}
          onConfirmar={(p) => confirmarPagamento.mutate(p)}
          confirmandoId={confirmarPagamento.isPending ? confirmarPagamento.variables?.id : undefined}
        />
      )}

      {open && (
        <NewPagamentoModal
          excursaoId={id}
          onibusId={onibusId ?? null}
          passageiros={passageiros.map((p) => ({ id: p.id, nome: p.nome, onibus_id: p.onibus_id }))}
          precoSugerido={Number(excursao?.preco ?? 0)}
          preselectedPaxId={preselectedPaxId}
          onClose={() => { setOpen(false); setPreselectedPaxId(null); }}
        />
      )}
    </div>
  );
}

function needsAction(r: { passageiro: { payment_status: string } | null; pedidos: { status: string }[] }) {
  const payPending = r.passageiro && r.passageiro.payment_status !== "paid";
  const ticketPending = r.pedidos.some(
    (p) => p.status !== "enviado" && p.status !== "recebido" && p.status !== "cancelado",
  );
  const naoRecebido = r.pedidos.some((p) => p.status === "nao_recebido");
  return Boolean(payPending || ticketPending || naoRecebido);
}

function PedidoCard({
  row, itemById, onibusById, pontoById, pendingPayment, onConfirmar, onMarcarEnviado, confirmandoId,
}: {
  row: { key: string; passageiro: Passageiro | null; nome: string; telefone: string | null; email: string | null; pedidos: PedidoItem[]; hasExcursao: boolean };
  itemById: Map<string, ExcursaoItem>;
  onibusById: Map<string, Onibus>;
  pontoById: Map<string, Ponto>;
  pendingPayment?: Pagamento;
  onConfirmar: (p: Pagamento) => void;
  onMarcarEnviado: (p: PedidoItem) => void;
  confirmandoId?: string;
}) {
  const [open, setOpen] = useState(false);
  const pax = row.passageiro;
  const hasItems = row.pedidos.length > 0;
  const combo = row.pedidos.some((p) => itemById.get(p.item_id)?.inclui_excursao);
  const tipoLabel = (() => {
    if (row.hasExcursao && !hasItems) return "Somente excursão";
    if (!row.hasExcursao && hasItems) {
      const tipos = Array.from(new Set(row.pedidos.map((p) => itemById.get(p.item_id)?.tipo).filter(Boolean)));
      return `Somente ${tipos.join(" + ") || "ingresso"}`;
    }
    if (combo) return "Combo excursão + ingresso";
    return "Excursão + itens";
  })();

  const payStatus = pax?.payment_status ?? "pending_payment";
  const payLabel = payStatus === "paid" ? "Pago" : payStatus === "partial_payment" ? "Parcial" : "Aguardando";
  const payTone = payStatus === "paid" ? "text-neon-green border-neon-green/40 bg-neon-green/10"
    : payStatus === "partial_payment" ? "text-yellow-300 border-yellow-400/40 bg-yellow-400/10"
    : "text-orange-300 border-orange-400/40 bg-orange-400/10";

  const excStatus = pax?.embarcado_em ? "Check-in" : pax?.status === "confirmado" ? "Confirmado" : "Reserva";
  const excTone = pax?.embarcado_em ? "text-neon-green" : pax?.status === "confirmado" ? "text-neon-pink" : "text-muted-foreground";

  const totalPedidos = row.pedidos.reduce((s, p) => s + Number(p.valor_total), 0);
  const totalGeral = (pax ? Number(pax.total_price) : 0) + totalPedidos;
  const pago = pax ? Number(pax.amount_paid) : 0;

  const onibus = pax?.onibus_id ? onibusById.get(pax.onibus_id) : null;
  const ponto = pax?.ponto_embarque_id ? pontoById.get(pax.ponto_embarque_id) : null;

  const ingressosPendentes = row.pedidos.filter(
    (p) => p.status !== "enviado" && p.status !== "recebido" && p.status !== "nao_recebido" && p.status !== "cancelado",
  );
  const naoRecebidos = row.pedidos.filter((p) => p.status === "nao_recebido");
  const precisaPag = pax && payStatus !== "paid" && totalGeral > 0 && !!pendingPayment;

  return (
    <li className="glass rounded-2xl p-4 border border-border/60">
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-gradient-to-br from-neon-purple/30 to-neon-pink/20 grid place-items-center shrink-0">
          <User className="size-4 text-neon-pink" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{row.nome}</p>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{tipoLabel}</span>
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${payTone}`}>
              {payLabel}
            </span>
            {pax && (
              <span className={`text-[10px] uppercase tracking-wider font-bold ${excTone}`}>
                · {excStatus}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display font-black text-base leading-none">{brl(totalGeral)}</p>
          {pago > 0 && pago < totalGeral && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Pago {brl(pago)}</p>
          )}
        </div>
      </div>

      {/* Quick action chips */}
      {(precisaPag || ingressosPendentes.length > 0) && (
        <div className="flex gap-2 flex-wrap mt-3">
          {precisaPag && pax && (
            <button
              onClick={() => onConfirmar(pendingPayment)}
              disabled={confirmandoId === pendingPayment.id}
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full bg-neon-green/20 text-neon-green border border-neon-green/40 hover:bg-neon-green/30 disabled:opacity-50"
            >
              <CheckCircle2 className="size-3.5" /> Confirmar pagamento
            </button>
          )}
          {ingressosPendentes.map((p) => {
            const it = itemById.get(p.item_id);
            return (
              <button
                key={p.id}
                onClick={() => onMarcarEnviado(p)}
                className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full bg-neon-pink/15 text-neon-pink border border-neon-pink/40 hover:bg-neon-pink/25"
              >
                <Send className="size-3.5" /> Enviar {it?.nome ?? "ingresso"}
              </button>
            );
          })}
        </div>
      )}

      {naoRecebidos.length > 0 && (
        <div className="mt-3 rounded-xl bg-red-500/10 border border-red-500/40 px-3 py-2 text-[11px] text-red-300 flex items-start gap-2">
          <span className="font-bold">⚠️</span>
          <div className="flex-1">
            <p className="font-bold uppercase tracking-wider text-[10px]">Passageiro não recebeu</p>
            <p className="text-red-300/90">
              {naoRecebidos.map((p) => itemById.get(p.item_id)?.nome ?? "Ingresso").join(", ")} — reenvie e confirme com o passageiro.
            </p>
          </div>
          {naoRecebidos.map((p) => (
            <button
              key={p.id}
              onClick={() => onMarcarEnviado(p)}
              className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full bg-neon-pink/20 text-neon-pink border border-neon-pink/40 shrink-0"
            >
              Reenviar
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-3 text-[11px] text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
      >
        {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        {open ? "Ocultar detalhes" : "Ver detalhes"}
      </button>

      {open && (
        <div className="mt-3 pt-3 border-t border-border/60 space-y-3 text-xs">
          {(row.telefone || row.email) && (
            <div className="flex gap-3 flex-wrap text-muted-foreground">
              {row.telefone && <span className="inline-flex items-center gap-1"><Phone className="size-3" /> {row.telefone}</span>}
              {row.email && <span className="inline-flex items-center gap-1"><Mail className="size-3" /> {row.email}</span>}
            </div>
          )}

          {pax && (
            <div className="grid grid-cols-3 gap-2">
              <Mini label="Ônibus" value={onibus?.nome ?? "—"} icon={Bus} />
              <Mini label="Poltrona" value={pax.assento ?? "—"} icon={Armchair} />
              <Mini label="Embarque" value={ponto?.nome ?? "—"} icon={MapPin} />
            </div>
          )}

          {row.pedidos.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Itens</p>
              {row.pedidos.map((p) => {
                const it = itemById.get(p.item_id);
                const recebido = p.status === "recebido";
                const naoRecebido = p.status === "nao_recebido";
                const enviado = p.status === "enviado" || recebido || naoRecebido;
                const badgeClass = naoRecebido
                  ? "bg-red-500/20 text-red-300 ring-1 ring-red-500/40"
                  : recebido
                  ? "bg-neon-green/25 text-neon-green"
                  : enviado
                  ? "bg-neon-green/15 text-neon-green"
                  : "bg-yellow-400/15 text-yellow-300";
                const badgeText = naoRecebido
                  ? "Não recebido"
                  : recebido
                  ? "Recebido"
                  : enviado
                  ? "Enviado"
                  : "Pendente";
                return (
                  <div key={p.id} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${naoRecebido ? "bg-red-500/10 ring-1 ring-red-500/30" : "bg-secondary/40"}`}>
                    {it?.inclui_excursao ? <Package className="size-3.5 text-neon-pink" /> : <Ticket className="size-3.5 text-neon-purple" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{it?.nome ?? "Item"} · x{p.quantidade}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {it?.tipo ?? "ingresso"}{it?.inclui_excursao ? " · combo" : ""} · {brl(Number(p.valor_total))}
                        {naoRecebido && " · passageiro não recebeu"}
                      </p>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                      {badgeText}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Mini({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-lg bg-secondary/40 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
        <Icon className="size-3" /> {label}
      </div>
      <p className="text-xs font-semibold truncate mt-0.5">{value}</p>
    </div>
  );
}

function PagamentosDetalhe({
  pagamentos, passageiros, onConfirmar, confirmandoId,
}: {
  pagamentos: Pagamento[];
  passageiros: Passageiro[];
  onConfirmar: (p: Pagamento) => void;
  confirmandoId?: string;
}) {
  const [open, setOpen] = useState(false);
  const nomeMap = new Map(passageiros.map((p) => [p.id, p.nome]));
  const reservaNomeMap = new Map(passageiros.filter((p) => p.reserva_id).map((p) => [p.reserva_id!, p.nome]));
  return (
    <div className="mt-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full glass rounded-2xl p-3 flex items-center justify-between text-sm font-bold"
      >
        <span>Histórico de lançamentos ({pagamentos.length})</span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5">
          {pagamentos.map((p) => {
            const isPendente = p.status === "pendente";
            const nome = p.passageiro_id
              ? nomeMap.get(p.passageiro_id)
              : p.reserva_id
              ? reservaNomeMap.get(p.reserva_id)
              : undefined;
            return (
              <li key={p.id} className="glass rounded-xl px-3 py-2 flex items-center gap-2 text-xs">
                <span className="flex-1 truncate">{nome ?? "—"}</span>
                <span className="text-muted-foreground uppercase text-[10px]">{p.metodo}</span>
                <span className="font-bold">{brl(Number(p.valor))}</span>
                <button
                  type="button"
                  onClick={() => isPendente && onConfirmar(p)}
                  disabled={!isPendente || confirmandoId === p.id}
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full disabled:cursor-default ${
                    p.status === "pago" || p.status === "confirmado" ? "bg-neon-green/15 text-neon-green"
                    : p.status === "estornado" ? "bg-red-500/15 text-red-400"
                    : "bg-yellow-400/15 text-yellow-300 hover:bg-yellow-400/25"
                  }`}
                >{confirmandoId === p.id ? "confirmando" : p.status}</button>
              </li>
            );
          })}
        </ul>
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
  excursaoId, onibusId, passageiros, precoSugerido, preselectedPaxId, onClose,
}: {
  excursaoId: string;
  onibusId: string | null;
  passageiros: { id: string; nome: string; onibus_id: string | null }[];
  precoSugerido: number;
  preselectedPaxId?: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    passageiro_id: preselectedPaxId ?? passageiros[0]?.id ?? "",
    valor: "",
    metodo: "pix",
    status: "pendente",
    observacao: "",
  });
  const [saving, setSaving] = useState(false);
  void precoSugerido;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.passageiro_id) { toast.error("Cadastre um passageiro primeiro."); return; }
    setSaving(true);
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
    if (error) { toast.error(error.message); return; }
    toast.success("Lançamento criado.");
    qc.invalidateQueries({ queryKey: ["pagamentos", excursaoId, onibusId ?? "all"] });
    qc.invalidateQueries({ queryKey: ["fin-passageiros", excursaoId, onibusId ?? "all"] });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="glass rounded-3xl p-6 w-full max-w-md border border-border">
        <h2 className="font-display text-xl font-black mb-4">Novo lançamento</h2>
        <div className="space-y-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Passageiro</span>
            <select required value={form.passageiro_id} onChange={(e) => setForm({ ...form, passageiro_id: e.target.value })}
              className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border text-sm">
              {passageiros.length === 0 && <option value="">— sem passageiros —</option>}
              {passageiros.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Valor</span>
              <input required type="number" step="0.01" value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border text-sm" />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Método</span>
              <select value={form.metodo} onChange={(e) => setForm({ ...form, metodo: e.target.value })}
                className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border text-sm">
                <option value="pix">PIX</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
                <option value="transferencia">Transferência</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Status</span>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border text-sm">
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Observação</span>
            <input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border text-sm" />
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
    if (error) { toast.error(error.message); return; }
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
          <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none" placeholder="0,00" />
        </div>
        <button onClick={save} disabled={saving || !dirty}
          className="h-11 px-4 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-primary-foreground font-bold text-sm disabled:opacity-40 inline-flex items-center gap-1.5">
          {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "..." : saved ? "Salvo" : "Salvar"}
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">Despesa total com transporte. Entra no cálculo do lucro líquido.</p>
    </div>
  );
}
