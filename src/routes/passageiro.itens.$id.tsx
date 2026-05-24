import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import {
  ArrowLeft, Loader2, Plus, Minus, ShoppingBag, Ticket, Tent, HeartHandshake,
  Crown, KeyRound, Package, Clock, CheckCircle2, Mail,
} from "lucide-react";
import { Shell } from "@/components/passageiro/Shell";

export const Route = createFileRoute("/passageiro/itens/$id")({
  component: ItensPassageiro,
});

const TIPOS: Record<string, { label: string; icon: any }> = {
  ingresso: { label: "Ingresso", icon: Ticket },
  camping: { label: "Camping", icon: Tent },
  solidario: { label: "Ticket solidário", icon: HeartHandshake },
  vip: { label: "VIP", icon: Crown },
  backstage: { label: "Backstage", icon: KeyRound },
  combo: { label: "Combo", icon: Package },
  outro: { label: "Outro", icon: Package },
};

function brl(v: number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ItensPassageiro() {
  const { id } = useParams({ from: "/passageiro/itens/$id" });
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: ex } = useQuery({
    queryKey: ["excursao-pub", id],
    queryFn: async () => {
      const { data } = await supabase.from("excursoes").select("id, titulo, destino, data_evento, banner_url, cor").eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["pax-itens", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("excursao_itens")
        .select("*")
        .eq("excursao_id", id)
        .eq("ativo", true)
        .neq("status", "oculto")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: meusPedidos = [] } = useQuery({
    queryKey: ["pax-pedidos", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("pedidos_itens")
        .select("*")
        .eq("excursao_id", id)
        .eq("comprador_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  useRealtimeSync(
    `pax-itens-${id}`,
    [
      { table: "excursao_itens", filter: `excursao_id=eq.${id}` },
      { table: "pedidos_itens", filter: `excursao_id=eq.${id}` },
    ],
    [["pax-itens", id], ["pax-pedidos", id, user?.id]],
  );

  const itemMap = new Map(itens.map((i: any) => [i.id, i]));

  return (
    <Shell back={`/passageiro/reserva/${id}` as any} title="Itens da festa" subtitle={ex?.titulo}>
      <Link
        to="/passageiro"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-4 w-4" /> Minhas reservas
      </Link>

      <p className="text-xs text-muted-foreground mb-4">
        Estes itens são vendidos pelo organizador. A emissão oficial (ingresso, camping) é feita por ele fora
        do app após a confirmação do pagamento.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : itens.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Nenhum item disponível no momento.
        </div>
      ) : (
        <ul className="space-y-2 mb-6">
          {itens.map((it: any) => (
            <ItemCard key={it.id} item={it} excursaoId={id} userId={user?.id} />
          ))}
        </ul>
      )}

      {meusPedidos.length > 0 && (
        <>
          <h2 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground mb-2">
            Meus pedidos
          </h2>
          <ul className="space-y-2">
            {meusPedidos.map((p: any) => {
              const it: any = itemMap.get(p.item_id);
              return (
                <li key={p.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {it?.nome ?? "Item"} <span className="text-muted-foreground">× {p.quantidade}</span>
                    </p>
                    <p className="text-xs text-neon-green font-bold">{brl(p.valor_total)}</p>
                    {p.emitido_em && (
                      <p className="text-[10px] text-muted-foreground">
                        Emitido em {new Date(p.emitido_em).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                  <Status status={p.status} />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Shell>
  );
}

function ItemCard({ item, excursaoId, userId }: { item: any; excursaoId: string; userId?: string }) {
  const qc = useQueryClient();
  const meta = TIPOS[item.tipo] ?? TIPOS.outro;
  const Icon = meta.icon;
  const [qtd, setQtd] = useState(1);
  const [busy, setBusy] = useState(false);

  const restante =
    item.quantidade_total != null ? Math.max(0, item.quantidade_total - item.quantidade_vendida) : null;
  const esgotado = item.status === "esgotado" || (restante != null && restante <= 0);

  async function pedir() {
    if (!userId) return alert("Faça login para pedir.");
    if (qtd < 1) return;
    if (restante != null && qtd > restante) return alert("Quantidade indisponível.");
    setBusy(true);
    try {
      // tenta vincular ao passageiro do comprador, se houver
      const { data: pax } = await supabase
        .from("passageiros")
        .select("id")
        .eq("excursao_id", excursaoId)
        .eq("comprador_id", userId)
        .limit(1)
        .maybeSingle();

      const valor_total = Number(item.valor) * qtd;
      const { error } = await supabase.from("pedidos_itens").insert({
        excursao_id: excursaoId,
        item_id: item.id,
        passageiro_id: pax?.id ?? null,
        comprador_id: userId,
        quantidade: qtd,
        valor_unitario: item.valor,
        valor_total,
        status: "pendente",
      });
      if (error) throw error;
      // atualiza contador de vendidos
      await supabase
        .from("excursao_itens")
        .update({ quantidade_vendida: item.quantidade_vendida + qtd })
        .eq("id", item.id);

      qc.invalidateQueries({ queryKey: ["pax-itens", excursaoId] });
      qc.invalidateQueries({ queryKey: ["pax-pedidos", excursaoId, userId] });
      setQtd(1);
      alert("Pedido enviado! O organizador irá confirmar o pagamento e emitir.");
    } catch (err: any) {
      alert(err.message ?? "Erro ao pedir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={`glass rounded-2xl p-4 ${esgotado ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{item.nome}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{meta.label}</span>
            {esgotado && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold">
                ESGOTADO
              </span>
            )}
          </div>
          {item.descricao && <p className="text-xs text-muted-foreground mt-1">{item.descricao}</p>}
          <p className="text-sm font-bold text-neon-green mt-1">{brl(item.valor)}</p>
          {restante != null && !esgotado && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{restante} disponíveis</p>
          )}
        </div>
      </div>

      {!esgotado && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-secondary/40 rounded-xl border border-border">
            <button
              onClick={() => setQtd((q) => Math.max(1, q - 1))}
              className="h-9 w-9 grid place-items-center"
              aria-label="Menos"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center text-sm font-bold">{qtd}</span>
            <button
              onClick={() => setQtd((q) => q + 1)}
              className="h-9 w-9 grid place-items-center"
              aria-label="Mais"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={pedir}
            disabled={busy}
            className="flex-1 h-9 rounded-xl bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
            Pedir {brl(Number(item.valor) * qtd)}
          </button>
        </div>
      )}
    </li>
  );
}

function Status({ status }: { status: string }) {
  if (status === "enviado")
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-green/15 text-neon-green font-bold inline-flex items-center gap-1"><Mail className="h-3 w-3" />Enviado por e-mail</span>;
  if (status === "emitido")
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-purple/15 text-neon-purple font-bold inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Emitido</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-bold inline-flex items-center gap-1"><Clock className="h-3 w-3" />Pendente</span>;
}
