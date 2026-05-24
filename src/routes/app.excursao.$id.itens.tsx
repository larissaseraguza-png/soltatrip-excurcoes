import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import {
  ArrowLeft, Loader2, Plus, Pencil, Trash2, Save, X, Ticket,
  Tent, HeartHandshake, Crown, KeyRound, Package, CheckCircle2, Mail, Clock,
} from "lucide-react";

export const Route = createFileRoute("/app/excursao/$id/itens")({
  component: ItensPage,
});

type Item = {
  id: string;
  excursao_id: string;
  tipo: string;
  nome: string;
  descricao: string | null;
  valor: number;
  quantidade_total: number | null;
  quantidade_vendida: number;
  status: string; // disponivel | esgotado | oculto
  ativo: boolean;
  ordem: number;
};

type Pedido = {
  id: string;
  item_id: string;
  passageiro_id: string | null;
  comprador_id: string;
  quantidade: number;
  valor_total: number;
  status: string; // pendente | emitido | enviado
  emitido_em: string | null;
  enviado_em: string | null;
  observacao: string | null;
  created_at: string;
};

const TIPOS = [
  { v: "ingresso", label: "Ingresso", icon: Ticket },
  { v: "camping", label: "Camping", icon: Tent },
  { v: "solidario", label: "Ticket solidário", icon: HeartHandshake },
  { v: "vip", label: "VIP", icon: Crown },
  { v: "backstage", label: "Backstage", icon: KeyRound },
  { v: "combo", label: "Combo", icon: Package },
  { v: "outro", label: "Outro", icon: Package },
];

function tipoMeta(t: string) {
  return TIPOS.find((x) => x.v === t) ?? TIPOS[TIPOS.length - 1];
}

function brl(v: number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ItensPage() {
  const { id } = useParams({ from: "/app/excursao/$id/itens" });
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["excursao-itens", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("excursao_itens")
        .select("*")
        .eq("excursao_id", id)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ["excursao-pedidos", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos_itens")
        .select("*")
        .eq("excursao_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Pedido[];
    },
  });

  useRealtimeSync(
    `excursao-itens-${id}`,
    [
      { table: "excursao_itens", filter: `excursao_id=eq.${id}` },
      { table: "pedidos_itens", filter: `excursao_id=eq.${id}` },
    ],
    [["excursao-itens", id], ["excursao-pedidos", id]],
  );

  const receita = pedidos
    .filter((p) => p.status !== "cancelado")
    .reduce((s, p) => s + Number(p.valor_total ?? 0), 0);
  const pendentes = pedidos.filter((p) => p.status === "pendente").length;
  const esgotados = itens.filter((i) => i.status === "esgotado").length;

  return (
    <div>
      <Link
        to="/app/excursao/$id"
        params={{ id }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <header className="mb-5">
        <h1 className="font-display text-2xl font-black">Promoter · Itens da festa</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastre ingressos, camping, ticket solidário, VIP, backstage e combos. Os passageiros poderão pedir
          dentro do app; a emissão oficial é feita por você fora do sistema.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Stat label="Receita" value={brl(receita)} />
        <Stat label="Pedidos pendentes" value={pendentes} tone={pendentes > 0 ? "warn" : "default"} />
        <Stat label="Itens cadastrados" value={itens.length} />
        <Stat label="Esgotados" value={esgotados} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">
          Itens
        </h2>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground font-bold text-xs"
        >
          <Plus className="h-4 w-4" /> Novo item
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : itens.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground mb-6">
          Nenhum item cadastrado ainda.
        </div>
      ) : (
        <ul className="space-y-2 mb-6">
          {itens.map((it) => (
            <ItemCard key={it.id} item={it} onEdit={() => setEditing(it)} />
          ))}
        </ul>
      )}

      <PedidosSection excursaoId={id} itens={itens} pedidos={pedidos} />

      {(creating || editing) && (
        <ItemEditor
          excursaoId={id}
          item={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["excursao-itens", id] });
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "warn" | "default" }) {
  return (
    <div className={`glass rounded-2xl p-3 ${tone === "warn" ? "border border-yellow-500/40" : ""}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
      <p className={`text-lg font-black mt-0.5 ${tone === "warn" ? "text-yellow-400" : ""}`}>{value}</p>
    </div>
  );
}

function ItemCard({ item, onEdit }: { item: Item; onEdit: () => void }) {
  const meta = tipoMeta(item.tipo);
  const Icon = meta.icon;
  const restante =
    item.quantidade_total != null
      ? Math.max(0, item.quantidade_total - item.quantidade_vendida)
      : null;

  return (
    <li className={`glass rounded-2xl p-4 ${!item.ativo ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{item.nome}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              {meta.label}
            </span>
            <StatusPill status={item.status} ativo={item.ativo} />
          </div>
          {item.descricao && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.descricao}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="font-bold text-neon-green">{brl(item.valor)}</span>
            <span className="text-muted-foreground">
              {item.quantidade_vendida} vendidos
              {restante != null && ` · ${restante} restam`}
            </span>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="h-8 w-8 grid place-items-center rounded-lg hover:bg-secondary"
          aria-label="Editar"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function StatusPill({ status, ativo }: { status: string; ativo: boolean }) {
  if (!ativo) {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-bold">Desativado</span>;
  }
  if (status === "esgotado") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold">Esgotado</span>;
  }
  if (status === "oculto") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-bold">Oculto</span>;
  }
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-green/15 text-neon-green font-bold">Disponível</span>;
}

function ItemEditor({
  excursaoId,
  item,
  onClose,
  onSaved,
}: {
  excursaoId: string;
  item: Item | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tipo, setTipo] = useState(item?.tipo ?? "ingresso");
  const [nome, setNome] = useState(item?.nome ?? "");
  const [descricao, setDescricao] = useState(item?.descricao ?? "");
  const [valor, setValor] = useState(String(item?.valor ?? ""));
  const [qtd, setQtd] = useState(item?.quantidade_total != null ? String(item.quantidade_total) : "");
  const [status, setStatus] = useState(item?.status ?? "disponivel");
  const [ativo, setAtivo] = useState(item?.ativo ?? true);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!nome.trim()) return toast.error("Informe o nome.");
    const v = Number(valor.replace(",", "."));
    if (Number.isNaN(v) || v < 0) return toast.error("Valor inválido.");
    const q = qtd.trim() === "" ? null : Number(qtd);
    if (q != null && (Number.isNaN(q) || q < 0)) return toast.error("Quantidade inválida.");

    setBusy(true);
    try {
      const payload = {
        excursao_id: excursaoId,
        tipo,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        valor: v,
        quantidade_total: q,
        status,
        ativo,
      };
      if (item) {
        const { error } = await supabase.from("excursao_itens").update(payload).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("excursao_itens").insert(payload);
        if (error) throw error;
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!item) return;
    if (!confirm("Remover este item? Pedidos relacionados também serão excluídos.")) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("excursao_itens").delete().eq("id", item.id);
      if (error) throw error;
      onSaved();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao remover.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm grid place-items-end sm:place-items-center p-3">
      <div className="w-full max-w-md glass rounded-3xl p-5 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-black text-lg">{item ? "Editar item" : "Novo item"}</h3>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Tipo</span>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
            >
              {TIPOS.map((t) => (
                <option key={t.v} value={t.v}>{t.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Nome</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Ingresso pista"
              className="mt-1 w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Descrição</span>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              placeholder="Opcional"
              className="mt-1 w-full px-3 py-2 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Valor (R$)</span>
              <input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className="mt-1 w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Qtd. total</span>
              <input
                value={qtd}
                onChange={(e) => setQtd(e.target.value)}
                inputMode="numeric"
                placeholder="Ilimitado"
                className="mt-1 w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
            >
              <option value="disponivel">Disponível</option>
              <option value="esgotado">Esgotado</option>
              <option value="oculto">Oculto</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="h-4 w-4"
            />
            Item ativo
          </label>
        </div>

        <div className="flex items-center gap-2 mt-5">
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 h-11 rounded-xl bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </button>
          {item && (
            <button
              onClick={remove}
              disabled={busy}
              className="h-11 px-4 rounded-xl border border-red-500/40 text-red-400 font-bold flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PedidosSection({
  excursaoId,
  itens,
  pedidos,
}: {
  excursaoId: string;
  itens: Item[];
  pedidos: Pedido[];
}) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"todos" | "pendente" | "emitido" | "enviado">("todos");

  const { data: passageiros = [] } = useQuery({
    queryKey: ["pedidos-passageiros", excursaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passageiros")
        .select("id, nome, email")
        .eq("excursao_id", excursaoId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const paxMap = new Map(passageiros.map((p: any) => [p.id, p]));
  const itemMap = new Map(itens.map((i) => [i.id, i]));

  const filtrados = pedidos.filter((p) => filter === "todos" || p.status === filter);

  async function setStatus(p: Pedido, novo: "pendente" | "emitido" | "enviado") {
    const patch: any = { status: novo };
    if (novo === "emitido") patch.emitido_em = new Date().toISOString();
    if (novo === "enviado") {
      patch.enviado_em = new Date().toISOString();
      if (!p.emitido_em) patch.emitido_em = new Date().toISOString();
    }
    if (novo === "pendente") {
      patch.emitido_em = null;
      patch.enviado_em = null;
    }
    const { error } = await supabase.from("pedidos_itens").update(patch).eq("id", p.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["excursao-pedidos", excursaoId] });
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">
          Pedidos dos passageiros
        </h2>
      </div>

      <div className="flex gap-2 mb-3 overflow-x-auto">
        {(["todos", "pendente", "emitido", "enviado"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 h-8 rounded-full text-xs font-bold capitalize whitespace-nowrap ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Nenhum pedido {filter !== "todos" ? `(${filter})` : ""}.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtrados.map((p) => {
            const item = itemMap.get(p.item_id);
            const pax: any = p.passageiro_id ? paxMap.get(p.passageiro_id) : null;
            return (
              <li key={p.id} className="glass rounded-2xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">
                      {item?.nome ?? "Item"} <span className="text-muted-foreground">× {p.quantidade}</span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {pax?.nome ?? "Comprador"} {pax?.email && `· ${pax.email}`}
                    </p>
                    <p className="text-xs mt-1">
                      <span className="font-bold text-neon-green">{brl(p.valor_total)}</span>
                      {p.emitido_em && (
                        <span className="text-muted-foreground ml-2">
                          · emitido {new Date(p.emitido_em).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </p>
                  </div>
                  <PedidoStatus status={p.status} />
                </div>
                <div className="flex gap-2 mt-2">
                  {p.status === "pendente" && (
                    <button
                      onClick={() => setStatus(p, "emitido")}
                      className="flex-1 h-8 rounded-lg bg-neon-purple/20 text-neon-purple text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Marcar emitido
                    </button>
                  )}
                  {p.status !== "enviado" && (
                    <button
                      onClick={() => setStatus(p, "enviado")}
                      className="flex-1 h-8 rounded-lg bg-neon-green/20 text-neon-green text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Mail className="h-3.5 w-3.5" /> Enviado por e-mail
                    </button>
                  )}
                  {p.status !== "pendente" && (
                    <button
                      onClick={() => setStatus(p, "pendente")}
                      className="h-8 px-2 rounded-lg bg-secondary text-muted-foreground text-xs font-bold"
                    >
                      Reabrir
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PedidoStatus({ status }: { status: string }) {
  if (status === "enviado")
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-green/15 text-neon-green font-bold inline-flex items-center gap-1"><Mail className="h-3 w-3" />Enviado</span>;
  if (status === "emitido")
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-purple/15 text-neon-purple font-bold inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Emitido</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-bold inline-flex items-center gap-1"><Clock className="h-3 w-3" />Pendente</span>;
}
