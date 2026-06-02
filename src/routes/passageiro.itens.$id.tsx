import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import {
  ArrowLeft, Loader2, Plus, Minus, ShoppingBag, Ticket, Tent, HeartHandshake,
  Crown, KeyRound, Package, Clock, CheckCircle2, Mail, Copy, QrCode,
  CreditCard, ExternalLink, ThumbsUp, AlertTriangle, CircleDot,
} from "lucide-react";
import { Shell } from "@/components/passageiro/Shell";
import { emitBusinessEvent } from "@/lib/notifications/business";

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
      const { data } = await supabase.from("excursoes").select("id, titulo, destino, data_evento, banner_url, cor, preco").eq("id", id).maybeSingle();
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

  const { data: payInfo } = useQuery({
    queryKey: ["pax-itens-payinfo", id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_excursao_payment_info", { p_excursao_id: id });
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as null | {
        pix_key: string | null;
        pix_recipient: string | null;
        pix_qr_url: string | null;
        payment_links: { label: string; url: string; provider?: string }[] | null;
        organizer_name: string | null;
      };
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
  const temPedidoPendente = (meusPedidos as any[]).some((p) => p.status === "pendente");

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

      {(temPedidoPendente || (meusPedidos as any[]).length > 0) && (
        <PaymentPanel payInfo={payInfo} />
      )}



      {meusPedidos.length > 0 && (
        <>
          <h2 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground mb-2">
            Meus pedidos
          </h2>
          <ul className="space-y-3">
            {meusPedidos.map((p: any) => {
              const it: any = itemMap.get(p.item_id);
              return <PedidoCard key={p.id} pedido={p} item={it} excursaoId={id} userId={user?.id} />;
            })}
          </ul>
        </>
      )}
    </Shell>
  );
}

function ItemCard({ item, excursaoId, userId }: { item: any; excursaoId: string; userId?: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const meta = TIPOS[item.tipo] ?? TIPOS.outro;
  const Icon = meta.icon;
  const [qtd, setQtd] = useState(1);
  const [busy, setBusy] = useState(false);
  const ehCombo = !!item.inclui_excursao;

  const restante =
    item.quantidade_total != null ? Math.max(0, item.quantidade_total - item.quantidade_vendida) : null;
  const esgotado = item.status === "esgotado" || (restante != null && restante <= 0);

  async function pedir() {
    if (!userId) return toast.error("Faça login para pedir.");
    if (qtd < 1) return;
    if (restante != null && qtd > restante) return toast.error("Quantidade indisponível.");
    setBusy(true);
    try {
      // procura passageiro/reserva existente do comprador nesta excursão
      let { data: pax } = await supabase
        .from("passageiros")
        .select("id, reserva_id")
        .eq("excursao_id", excursaoId)
        .eq("comprador_id", userId)
        .limit(1)
        .maybeSingle();

      let novaReservaId: string | null = null;

      // COMBO: se inclui excursão e ainda não há reserva, cria uma automática
      if (ehCombo && !pax) {
        const { data: u } = await supabase.auth.getUser();
        const userMeta = u?.user?.user_metadata ?? {};
        const nome =
          (userMeta.full_name as string) ||
          (userMeta.name as string) ||
          (u?.user?.email?.split("@")[0] ?? "Passageiro");
        const email = u?.user?.email ?? null;

        const passageiros = Array.from({ length: qtd }).map((_, i) => ({
          nome: i === 0 ? nome : `${nome} (acompanhante ${i})`,
          email: i === 0 ? email : null,
          titular: i === 0,
        }));

        const { data: novaId, error: errRpc } = await supabase.rpc("criar_reserva_grupo", {
          p_excursao_id: excursaoId,
          p_passageiros: passageiros,
          p_onibus_id: null,
        } as any);
        if (errRpc) throw errRpc;
        novaReservaId = novaId as string;

        const { data: paxCriado } = await supabase
          .from("passageiros")
          .select("id, reserva_id")
          .eq("reserva_id", novaReservaId)
          .eq("comprador_id", userId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        pax = paxCriado ?? null;
      }

      // RPC atômica: valida quantidade no servidor, evita race condition e oversell.
      // Também cria o pedido em pedidos_itens (não inserir aqui no cliente).
      const { error: errCompra } = await supabase.rpc("comprar_item", {
        p_item_id: item.id,
        p_qtd: qtd,
        p_excursao_id: excursaoId,
      } as any);
      if (errCompra) {
        const msg = errCompra.message ?? "";
        if (msg.includes("sold_out")) throw new Error("Item esgotado.");
        if (msg.includes("invalid_quantity")) throw new Error("Quantidade inválida (1 a 10).");
        if (msg.includes("item_unavailable")) throw new Error("Item indisponível.");
        if (msg.includes("not_authenticated")) throw new Error("Faça login para pedir.");
        throw errCompra;
      }

      qc.invalidateQueries({ queryKey: ["pax-itens", excursaoId] });
      qc.invalidateQueries({ queryKey: ["pax-pedidos", excursaoId, userId] });
      qc.invalidateQueries({ queryKey: ["minhas-reservas", userId] });
      setQtd(1);

      if (ehCombo) {
        const reservaId = novaReservaId ?? pax?.reserva_id;
        toast.success("Combo reservado! Escolha ônibus, poltrona e embarque.");
        if (novaReservaId) {
          const reservaLink = reservaId ? `/passageiro/reserva/${reservaId}` : "/passageiro";
          // booking.created da nova reserva é emitido pela trigger DB em `reservas`;
          // o item.ordered (abaixo) cobre a faceta de pedido para organizadores/sócios.

          void emitBusinessEvent({
            type: "item.ordered",
            excursaoId: excursaoId,
            reservaId: novaReservaId,
            title: "Novo pedido de item",
            message: `Pedido do combo "${item.nome}".`,
            link: `/app/excursao/${excursaoId}/passageiros`,
            recipientRoles: ["organizer_root", "organizer_socios"],
            dedupeKey: `item.ordered:${novaReservaId}:${item.id}`,
            data: { item_id: item.id, item_nome: item.nome, quantidade: qtd, combo: true },
          });
        }
        if (reservaId) {
          navigate({ to: "/passageiro/reserva/$id", params: { id: reservaId } });
        } else if (pax?.id) {
          navigate({ to: "/passageiro/poltrona", search: { pax: pax.id } as any });
        }
      } else {
        toast.success("Pedido enviado! O organizador irá confirmar o pagamento e emitir.");
        void emitBusinessEvent({
          type: "item.ordered",
          excursaoId: excursaoId,
          passageiroId: pax?.id ?? null,
          title: "Novo pedido de item",
          message: `Pedido de ${qtd}x "${item.nome}".`,
          link: `/app/excursao/${excursaoId}/itens`,
          recipientRoles: ["organizer_root", "organizer_socios"],
          dedupeKey: `item.ordered:${userId}:${item.id}:${Date.now()}`,
          data: { item_id: item.id, item_nome: item.nome, quantidade: qtd, combo: false },
        });
      }
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      if (msg.includes("passageiro_duplicado")) {
        toast.error("Você já possui uma reserva nesta excursão.");
      } else {
        toast.error(err.message ?? "Erro ao pedir.");
      }
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
            {ehCombo && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground font-bold">
                COMBO • INCLUI EXCURSÃO
              </span>
            )}
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
            {ehCombo ? "Reservar combo" : "Pedir"} {brl(Number(item.valor) * qtd)}
          </button>
        </div>
      )}
    </li>
  );
}

function Status({ status }: { status: string }) {
  if (status === "recebido")
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-green/20 text-neon-green font-bold inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" />Recebido</span>;
  if (status === "nao_recebido")
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Não recebido</span>;
  if (status === "enviado")
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-green/15 text-neon-green font-bold inline-flex items-center gap-1"><Mail className="h-3 w-3" />Enviado por e-mail</span>;
  if (status === "emitido")
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-purple/15 text-neon-purple font-bold inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Emitido</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-bold inline-flex items-center gap-1"><Clock className="h-3 w-3" />Aguardando</span>;
}

function PedidoCard({ pedido, item, excursaoId, userId }: { pedido: any; item: any; excursaoId: string; userId?: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const jaEnviado = pedido.status === "enviado" || pedido.status === "emitido" || pedido.status === "recebido" || pedido.status === "nao_recebido";
  const finalizado = pedido.status === "recebido";
  const naoRecebido = pedido.status === "nao_recebido";
  const podeConfirmar = pedido.status === "enviado" || pedido.status === "emitido";

  async function marcar(novoStatus: "recebido" | "nao_recebido") {
    setBusy(true);
    try {
      const patch: any = { status: novoStatus };
      if (novoStatus === "recebido") patch.recebido_em = new Date().toISOString();
      else patch.nao_recebido_em = new Date().toISOString();
      const { error } = await supabase.from("pedidos_itens").update(patch).eq("id", pedido.id);
      if (error) throw error;
      toast.success(novoStatus === "recebido" ? "Recebimento confirmado." : "Aviso enviado ao organizador.");
      qc.invalidateQueries({ queryKey: ["pax-pedidos", excursaoId, userId] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao atualizar.");
    } finally {
      setBusy(false);
    }
  }

  const steps = [
    { key: "pedido", label: "Pedido feito", done: true },
    { key: "pago", label: "Pagamento confirmado", done: jaEnviado },
    { key: "enviado", label: "Ingresso enviado", done: jaEnviado },
    { key: "recebido", label: "Recebido", done: finalizado, alert: naoRecebido },
  ];

  return (
    <li className="glass rounded-2xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">
            {item?.nome ?? "Item"} <span className="text-muted-foreground">× {pedido.quantidade}</span>
          </p>
          <p className="text-xs text-neon-green font-bold">{brl(pedido.valor_total)}</p>
        </div>
        <Status status={pedido.status} />
      </div>

      <ol className="space-y-1.5 mb-3">
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2 text-xs">
            {s.alert ? (
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
            ) : s.done ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-neon-green shrink-0" />
            ) : (
              <CircleDot className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            )}
            <span className={s.done ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
            {s.key === "enviado" && pedido.enviado_em && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                {new Date(pedido.enviado_em).toLocaleDateString("pt-BR")}
              </span>
            )}
            {s.key === "recebido" && pedido.recebido_em && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                {new Date(pedido.recebido_em).toLocaleDateString("pt-BR")}
              </span>
            )}
          </li>
        ))}
      </ol>

      {podeConfirmar && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => marcar("recebido")}
            disabled={busy}
            className="h-9 rounded-xl bg-gradient-to-r from-neon-green/80 to-neon-green text-background font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <ThumbsUp className="h-3.5 w-3.5" /> Recebi ingresso
          </button>
          <button
            onClick={() => marcar("nao_recebido")}
            disabled={busy}
            className="h-9 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Não recebi
          </button>
        </div>
      )}

      {naoRecebido && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2 text-[11px] text-red-300">
          O organizador foi avisado. Em breve entrarão em contato.
          <button
            onClick={() => marcar("recebido")}
            disabled={busy}
            className="ml-2 underline font-bold"
          >
            Recebi agora
          </button>
        </div>
      )}

      {finalizado && (
        <p className="text-[11px] text-neon-green flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Recebimento confirmado por você.
        </p>
      )}
    </li>
  );
}

function PaymentPanel({ payInfo }: { payInfo: any }) {
  const [metodo, setMetodo] = useState<"pix" | "cartao">("pix");
  const [copied, setCopied] = useState(false);

  const links = (payInfo?.payment_links ?? []) as { label: string; url: string }[];
  const semInfo = !payInfo?.pix_key && !payInfo?.pix_qr_url && links.length === 0;

  return (
    <div className="glass rounded-2xl p-4 mb-6 border border-neon-pink/20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-sm">Como pagar</h3>
        {payInfo?.organizer_name && (
          <span className="text-[10px] text-muted-foreground">para {payInfo.organizer_name}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => setMetodo("pix")}
          className={`py-2 rounded-xl text-xs font-bold transition ${
            metodo === "pix"
              ? "bg-gradient-to-br from-neon-purple/30 to-neon-pink/20 text-neon-pink border border-neon-pink/40"
              : "bg-background/40 text-muted-foreground"
          }`}
        >
          PIX
        </button>
        <button
          onClick={() => setMetodo("cartao")}
          className={`py-2 rounded-xl text-xs font-bold transition ${
            metodo === "cartao"
              ? "bg-gradient-to-br from-neon-purple/30 to-neon-pink/20 text-neon-pink border border-neon-pink/40"
              : "bg-background/40 text-muted-foreground"
          }`}
        >
          Cartão / Link externo
        </button>
      </div>

      {semInfo && (
        <p className="text-xs text-yellow-300 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
          O organizador ainda não cadastrou formas de pagamento. Entre em contato pelo WhatsApp da excursão.
        </p>
      )}

      {metodo === "pix" && (
        <div className="space-y-3">
          {payInfo?.pix_qr_url && (
            <div className="bg-background/50 rounded-2xl p-3 flex flex-col items-center">
              <img
                src={payInfo.pix_qr_url}
                alt="QR Code Pix"
                className="size-40 object-contain rounded-xl bg-white p-2"
              />
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                <QrCode className="h-3 w-3" /> Escaneie no app do banco
              </p>
            </div>
          )}
          {payInfo?.pix_key && (
            <div className="bg-background/50 rounded-2xl px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Chave Pix
              </p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs font-mono truncate">{payInfo.pix_key}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(payInfo.pix_key!);
                    setCopied(true);
                    toast.success("Chave Pix copiada");
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="h-8 w-8 grid place-items-center rounded-lg bg-gradient-to-br from-neon-purple to-neon-pink text-primary-foreground shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              {copied && <p className="text-[10px] text-neon-green mt-1">Copiado!</p>}
            </div>
          )}
        </div>
      )}

      {metodo === "cartao" && (
        <div className="space-y-2">
          {links.length > 0 ? (
            links.map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 rounded-xl bg-background/50 px-3 py-2.5 border border-border hover:border-neon-pink/50 transition"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <CreditCard className="h-4 w-4 text-neon-pink" />
                  {l.label || "Pagar com cartão"}
                </span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            ))
          ) : (
            !semInfo && (
              <p className="text-xs text-muted-foreground rounded-xl bg-background/40 p-3">
                Nenhum link de cartão cadastrado. Use o PIX ou fale com o organizador.
              </p>
            )
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        Após pagar, envie o comprovante ao organizador pelo WhatsApp da excursão.
        A emissão do ingresso é feita manualmente após a confirmação.
      </p>
    </div>
  );
}

