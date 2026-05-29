import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Shell, Pill } from "@/components/passageiro/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { useFreshnessSync } from "@/hooks/use-freshness-sync";
import { toast } from "sonner";
import {
  Calendar,
  MapPin,
  Loader2,
  Armchair,
  Wallet,
  Clock,
  QrCode,
  Copy,
  CheckCircle2,
  MapPinned,
  Users,
  Bus,
  MessageCircle,
  Package,
  Mail,
  ThumbsUp,
  AlertTriangle,
  CircleDot,
  Ticket,
} from "lucide-react";


export const Route = createFileRoute("/passageiro/reserva/$id")({
  component: ReservaDetalhes,
});

const PIX_KEY = "soltatrip@pix.com.br";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ReservaDetalhes() {
  const { id } = useParams({ from: "/passageiro/reserva/$id" });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [metodo, setMetodo] = useState<"pix" | "pix_parcelado" | "debito" | "credito">("pix");
  const [valor, setValor] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: reserva, isLoading } = useQuery({
    queryKey: ["reserva-grupo", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservas")
        .select(
          "id, quantidade, total_price, amount_paid, payment_status, comprador_id, excursao:excursoes!reservas_excursao_id_fkey(id,titulo,destino,data_evento,horario_saida,horario_retorno,cor,banner_url,preco,whatsapp_group_url)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: passageiros = [], refetch: refetchPax } = useQuery({
    queryKey: ["reserva-passageiros", id],
    enabled: !!reserva,
    // Sempre revalidar ao montar/voltar para esta tela — evita exibir cache
    // antigo após o usuário escolher poltrona/embarque em outra rota e
    // retornar via "Continuar para a reserva".
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passageiros")
        .select(
          "id, nome, email, status, qr_code, seat_id, assento, ponto_embarque_id, convite_token, user_id, embarcado_em, onibus_id, onibus:onibus(id, nome, horario_saida, horario_retorno, ponto_partida, capacidade, whatsapp_group_url)",
        )
        .eq("reserva_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const onibusId = (passageiros as any[])[0]?.onibus_id ?? null;
  const onibusInfo = (passageiros as any[])[0]?.onibus ?? null;

  const { data: seats = [] } = useQuery({
    queryKey: ["reserva-seats", reserva?.excursao?.id, onibusId],
    enabled: !!reserva?.excursao?.id,
    queryFn: async () => {
      let q = supabase
        .from("seats")
        .select("id, seat_number, onibus_id")
        .eq("excursao_id", reserva!.excursao.id);
      if (onibusId) q = q.eq("onibus_id", onibusId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pontos = [] } = useQuery({
    queryKey: ["reserva-pontos", reserva?.excursao?.id, onibusId],
    enabled: !!reserva?.excursao?.id,
    queryFn: async () => {
      let q = supabase
        .from("pontos_embarque")
        .select("id, nome, endereco, referencia, horario, ordem, onibus_id")
        .eq("excursao_id", reserva!.excursao.id)
        .order("ordem", { ascending: true });
      if (onibusId) q = q.or(`onibus_id.is.null,onibus_id.eq.${onibusId}`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });



  const { data: pagamentos = [] } = useQuery({
    queryKey: ["reserva-pagamentos", id],
    enabled: !!reserva,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos")
        .select("id, valor, metodo, status, parcelas, created_at")
        .eq("reserva_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pedidosItens = [] } = useQuery({
    queryKey: ["reserva-pedidos-itens", id, user?.id, reserva?.excursao?.id],
    enabled: !!reserva && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("pedidos_itens")
        .select("*, item:excursao_itens(id, nome, tipo)")
        .eq("excursao_id", reserva!.excursao.id)
        .eq("comprador_id", user!.id)
        .ilike("observacao", `%${id}%`)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });


  const notifyTripChange = useCallback(
    (payload: { table: string; eventType: string; new: Record<string, any>; old: Record<string, any> }) => {
      if (payload.table !== "passageiros" || payload.eventType !== "UPDATE") return;
      if (payload.new?.reserva_id !== id) return;

      const oldSeatId = payload.old?.seat_id ?? null;
      const newSeatId = payload.new?.seat_id ?? null;
      const oldAssento = payload.old?.assento ?? null;
      const newAssento = payload.new?.assento ?? null;
      if (oldSeatId !== newSeatId || oldAssento !== newAssento) {
        const seatLabel = (seats as any[]).find((s) => s.id === newSeatId)?.seat_number ?? newAssento;
        if (seatLabel) toast.info(`Sua poltrona foi alterada para ${seatLabel}.`);
      }

      const oldPontoId = payload.old?.ponto_embarque_id ?? null;
      const newPontoId = payload.new?.ponto_embarque_id ?? null;
      if (oldPontoId !== newPontoId) {
        const ponto = (pontos as any[]).find((p) => p.id === newPontoId);
        if (ponto) toast.info(`Seu embarque foi alterado para ${ponto.nome}${ponto.horario ? ` - ${ponto.horario}` : ""}.`);
      }
    },
    [id, pontos, seats],
  );

  useRealtimeSync(
    `reserva-${id}`,
    [
      { table: "reservas", filter: `id=eq.${id}` },
      { table: "passageiros", filter: `reserva_id=eq.${id}` },
      { table: "pagamentos", filter: `reserva_id=eq.${id}` },
      ...(reserva?.excursao?.id
        ? [
            { table: "seats", filter: `excursao_id=eq.${reserva.excursao.id}` },
            { table: "pontos_embarque", filter: `excursao_id=eq.${reserva.excursao.id}` },
            { table: "pedidos_itens", filter: `excursao_id=eq.${reserva.excursao.id}` },
          ]
        : []),
    ],
    [
      ["reserva-grupo", id, user?.id],
      ["reserva-passageiros", id],
      ["reserva-pagamentos", id],
      ["reserva-seats", reserva?.excursao?.id],
      ["reserva-pontos", reserva?.excursao?.id],
      ["reserva-pedidos-itens", id, user?.id, reserva?.excursao?.id],
    ],
    notifyTripChange,
  );


  if (authLoading || isLoading) {
    return (
      <Shell back="/passageiro" title="Reserva">
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  // ISOLAMENTO: a RLS libera staff/organizer da excursão a verem reservas
  // alheias — bloqueamos aqui para que a área /passageiro só mostre a reserva
  // se o usuário for o comprador OU passageiro vinculado (user_id).
  const isComprador = !!reserva && reserva.comprador_id === user?.id;
  const isLinkedPax =
    !!reserva &&
    (passageiros as any[]).some((p) => p.user_id && p.user_id === user?.id);
  const ownershipReady = !!reserva && (passageiros as any[]).length >= 0; // pax query rodou
  if (reserva && ownershipReady && !isComprador && !isLinkedPax) {
    console.error(
      "[CRITICAL DATA MIX DETECTED] /passageiro/reserva: tentativa de abrir reserva alheia bloqueada.",
      { reservaId: id, userId: user?.id },
    );
  }

  if (!reserva || (ownershipReady && !isComprador && !isLinkedPax)) {
    return (
      <Shell back="/passageiro" title="Reserva">
        <div className="glass rounded-3xl p-10 text-center">
          <p className="text-sm text-muted-foreground">Reserva não encontrada.</p>
          <Link
            to="/passageiro"
            className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Voltar
          </Link>
        </div>
      </Shell>
    );
  }

  const ex = reserva.excursao;
  const total = Number(reserva.total_price) || 0;
  const pago = Number(reserva.amount_paid) || 0;
  const restante = Math.max(0, total - pago);
  const pct = total > 0 ? Math.min(100, Math.round((pago / total) * 100)) : 0;
  const status = reserva.payment_status as string;

  const statusMap: Record<string, { tone: any; label: string }> = {
    pending_payment: { tone: "yellow", label: "Aguardando pagamento" },
    partial_payment: { tone: "purple", label: "Pagamento parcial" },
    paid: { tone: "green", label: "Quitado" },
    cancelled: { tone: "muted", label: "Cancelado" },
  };
  const s = statusMap[status] ?? statusMap.pending_payment;
  const passageirosList = passageiros as any[];
  const faltamPoltronas = passageirosList.some((p) => !p.seat_id);
  const faltamEmbarques = passageirosList.some((p) => p.seat_id && !p.ponto_embarque_id);

  async function pagar() {
    const v = Number(valor.replace(",", "."));
    if (!v || v <= 0) return toast.error("Informe um valor válido");
    if (v > restante + 0.001) return toast.error(`Valor máximo: ${brl(restante)}`);
    if (pago > 0 && v >= restante - 0.001 && (faltamPoltronas || faltamEmbarques)) {
      return toast.error("Confirme as poltronas e os pontos de embarque antes de finalizar o pagamento.");
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("pagamentos").insert({
        reserva_id: reserva.id,
        excursao_id: ex.id,
        valor: v,
        metodo,
        parcelas: 1,
        status: "confirmado",
        pago_em: new Date().toISOString(),
      } as any);
      if (error) throw error;
      setValor("");
      qc.invalidateQueries({ queryKey: ["reserva-grupo", id] });
      qc.invalidateQueries({ queryKey: ["reserva-pagamentos", id] });
      qc.invalidateQueries({ queryKey: ["reserva-passageiros", id] });
    } catch (err: any) {
      toast.error(err.message ?? "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  async function escolherPonto(paxId: string, pontoId: string) {
    const { error } = await supabase
      .from("passageiros")
      .update({ ponto_embarque_id: pontoId })
      .eq("id", paxId);
    if (error) return toast.error(error.message);
    refetchPax();
  }

  function copyInvite(token: string) {
    const url = `${window.location.origin}/invite/passageiro/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link de convite copiado!");
  }

  return (
    <Shell back="/passageiro" title="Reserva" subtitle={ex?.titulo}>
      {/* Banner */}
      <div className="relative rounded-3xl overflow-hidden mb-5 glow-primary">
        <div
          className="h-40 relative"
          style={{
            background: ex?.banner_url
              ? `url(${ex.banner_url}) center/cover`
              : `linear-gradient(135deg, ${ex?.cor ?? "#a855f7"}, #ec4899)`,
          }}
        >
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <Pill tone={s.tone}>{s.label}</Pill>
            <h1 className="font-display font-black text-2xl mt-2 leading-tight">{ex?.titulo}</h1>
          </div>
        </div>
      </div>

      {/* Resumo da excursão */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Info4
          icon={Calendar}
          label="Data"
          value={ex?.data_evento ? new Date(ex.data_evento).toLocaleDateString("pt-BR") : "—"}
        />
        <Info4 icon={MapPin} label="Destino" value={ex?.destino ?? "—"} />
        <Info4 icon={Clock} label="Saída" value={onibusInfo?.horario_saida ?? ex?.horario_saida ?? "—"} />
        <Info4 icon={Users} label="Passageiros" value={String(reserva.quantidade)} />
      </div>

      {/* Ingresso / combo vinculado à reserva */}
      {pedidosItens.length > 0 && (
        <ReservaIngressosCard
          pedidos={pedidosItens as any[]}
          pago={pago}
          onChanged={() => qc.invalidateQueries({ queryKey: ["reserva-pedidos-itens", id, user?.id, reserva?.excursao?.id] })}
        />
      )}


      {/* Grupo WhatsApp — liberado após primeiro pagamento */}
      {pago > 0 && (() => {
        const waUrl = onibusInfo?.whatsapp_group_url ?? ex?.whatsapp_group_url ?? null;
        if (!waUrl) {
          return (
            <div className="glass rounded-3xl p-4 mb-5 text-center text-xs text-muted-foreground">
              O organizador ainda não cadastrou o link do grupo de WhatsApp.
            </div>
          );
        }
        return (
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="mb-5 w-full h-14 rounded-2xl bg-gradient-to-r from-neon-green to-neon-purple text-primary-foreground font-display font-bold flex items-center justify-center gap-2 glow-primary"
          >
            <MessageCircle className="size-5" /> Entrar no grupo da excursão
          </a>
        );
      })()}


      {/* Ônibus do passageiro */}
      {onibusInfo && (
        <div className="glass rounded-3xl p-5 mb-5 border border-neon-purple/30">
          <div className="flex items-center gap-2 mb-3">
            <Bus className="size-5 text-neon-purple" />
            <h3 className="font-display font-bold">Seu ônibus</h3>
          </div>
          <p className="font-display font-black text-xl">{onibusInfo.nome}</p>
          <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
            {onibusInfo.horario_saida && (
              <div className="bg-background/40 rounded-2xl p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Saída</p>
                <p className="font-bold text-neon-pink">⏰ {onibusInfo.horario_saida}</p>
              </div>
            )}
            {onibusInfo.horario_retorno && (
              <div className="bg-background/40 rounded-2xl p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Retorno</p>
                <p className="font-bold">{onibusInfo.horario_retorno}</p>
              </div>
            )}
            {onibusInfo.ponto_partida && (
              <div className="bg-background/40 rounded-2xl p-3 col-span-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Ponto de partida</p>
                <p className="font-bold">{onibusInfo.ponto_partida}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pagamento consolidado */}
      <div className="glass rounded-3xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="size-5 text-neon-green" />
          <h3 className="font-display font-bold">Pagamento da reserva</h3>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">
              Total ({reserva.quantidade} × {brl(Number(ex?.preco) || 0)})
            </p>
            <p className="font-display font-black text-3xl bg-gradient-to-r from-neon-pink to-neon-green bg-clip-text text-transparent">
              {brl(total)}
            </p>
          </div>
          <Pill tone={s.tone}>{pct}%</Pill>
        </div>
        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon-purple to-neon-green transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          <div className="bg-background/40 rounded-2xl p-3">
            <p className="text-xs text-muted-foreground">Pago</p>
            <p className="font-bold text-neon-green">{brl(pago)}</p>
          </div>
          <div className="bg-background/40 rounded-2xl p-3">
            <p className="text-xs text-muted-foreground">Restante</p>
            <p className="font-bold">{brl(restante)}</p>
          </div>
        </div>

        {/* Form pagamento */}
        {isComprador && restante > 0 && status !== "cancelled" && (
          <div className="mt-5 pt-5 border-t border-border space-y-3">
            <p className="text-xs text-muted-foreground">Método</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: "pix", l: "PIX total" },
                { v: "pix_parcelado", l: "PIX fracionado" },
                { v: "debito", l: "Débito" },
                { v: "credito", l: "Crédito" },
              ].map((m) => (
                <button
                  key={m.v}
                  onClick={() => {
                    setMetodo(m.v as any);
                    if (m.v === "pix") setValor(restante.toFixed(2));
                  }}
                  className={`py-2.5 rounded-xl text-xs font-bold transition ${
                    metodo === m.v
                      ? "bg-gradient-to-br from-neon-purple/30 to-neon-pink/20 text-neon-pink border border-neon-pink/40"
                      : "bg-background/40 text-muted-foreground"
                  }`}
                >
                  {m.l}
                </button>
              ))}
            </div>

            <input
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder={`Valor (máx ${restante.toFixed(2)})`}
              className="w-full h-12 rounded-xl bg-background/40 px-4 text-sm"
            />

            {(metodo === "pix" || metodo === "pix_parcelado") && (
              <div className="bg-background/50 rounded-2xl px-4 py-3 flex items-center justify-between">
                <code className="text-sm font-mono truncate">{PIX_KEY}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(PIX_KEY);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="ml-2 size-9 grid place-items-center rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink text-primary-foreground"
                >
                  <Copy className="size-4" />
                </button>
              </div>
            )}
            {copied && <p className="text-xs text-neon-green">Chave copiada!</p>}

            <button
              onClick={pagar}
              disabled={submitting}
              className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground glow-primary disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Confirmar pagamento
            </button>
          </div>
        )}

        {pagamentos.length > 0 && (
          <details className="mt-4">
            <summary className="text-xs text-muted-foreground cursor-pointer">
              Histórico ({pagamentos.length})
            </summary>
            <div className="space-y-2 mt-2">
              {pagamentos.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-xs bg-background/30 rounded-xl p-2"
                >
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3 text-neon-green" />{" "}
                    {String(p.metodo).replace("_", " ")}
                  </span>
                  <span className="font-bold">{brl(Number(p.valor))}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Lista de passageiros */}
      <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
        <Users className="size-5 text-neon-pink" /> Passageiros
      </h2>
      <div className="space-y-4">
        {passageiros.map((p: any, idx: number) => {
          const seat = (seats as any[]).find((s) => s.id === p.seat_id);
          const seatLabel = seat?.seat_number ?? p.assento ?? null;
          const ponto = (pontos as any[]).find((pt) => pt.id === p.ponto_embarque_id);
          const podeEscolher = status !== "cancelled";
          const qrPayload = p.qr_code || p.id;
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload)}`;
          const isPaid = status === "paid";
          // Apenas o comprador (owner da reserva) edita poltrona/embarque.
          // Convidado é view-only conforme regra de "passageiro convidado".
          const isVinculadoOuComprador = isComprador;


          return (
            <div key={p.id} className="glass rounded-3xl overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-neon-purple/15 to-neon-pink/10 border-b border-border flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Passageiro {idx + 1}
                  </p>
                  <p className="font-display font-bold">{p.nome}</p>
                  <p className="text-[11px] text-muted-foreground">{p.email}</p>
                </div>
                {p.user_id ? (
                  <Pill tone="green">✓ Vinculado</Pill>
                ) : (
                  <Pill tone="yellow">Convidado</Pill>
                )}
              </div>

              <div className="p-5 space-y-4">
                {/* Convite */}
                {isComprador && p.convite_token && (
                  <div className="bg-neon-purple/10 border border-neon-purple/30 rounded-2xl p-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      Convide {p.nome} para acessar a própria reserva:
                    </p>
                    <button
                      onClick={() => copyInvite(p.convite_token)}
                      className="w-full h-10 rounded-xl font-semibold bg-neon-purple/20 text-neon-purple border border-neon-purple/40 text-sm inline-flex items-center justify-center gap-2"
                    >
                      <Copy className="size-4" /> Copiar link de convite
                    </button>
                  </div>
                )}

                {/* Poltrona */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Armchair className="size-4 text-neon-purple" />
                    <span className="text-sm font-bold">Poltrona</span>
                  </div>
                  {seatLabel ? (
                    <span className="font-display font-black text-lg">{seatLabel}</span>
                  ) : podeEscolher && isVinculadoOuComprador ? (
                    <button
                      onClick={() =>
                        navigate({ to: "/passageiro/poltrona", search: { pax: p.id } as any })
                      }
                      className="text-xs font-bold px-3 py-2 rounded-xl bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground"
                    >
                      Escolher
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>

                {/* Embarque */}
                <EmbarqueSection
                  pax={p}
                  ponto={ponto}
                  pontos={pontos as any[]}
                  seatSelected={!!seatLabel}
                  podeEscolher={podeEscolher}
                  isVinculadoOuComprador={isVinculadoOuComprador}
                  pago={pago}
                  onSelect={(pontoId: string) => escolherPonto(p.id, pontoId)}
                />

                {/* QR Code */}
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <QrCode className="size-4 text-neon-green" />
                    <span className="text-sm font-bold">QR Code</span>
                  </div>
                  {isPaid ? (
                    <div className="bg-gradient-to-br from-neon-green/10 to-neon-purple/10 border border-neon-green/30 rounded-2xl p-4 text-center">
                      <div className="mx-auto w-44 h-44 rounded-2xl bg-white p-2 grid place-items-center">
                        <img src={qrUrl} alt={`QR Code de ${p.nome}`} className="w-full h-full" />
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground mt-2 break-all">
                        {qrPayload}
                      </p>
                      {p.embarcado_em && (
                        <p className="text-xs text-neon-green mt-2">
                          ✓ Embarcado em {new Date(p.embarcado_em).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-muted/20 border-2 border-dashed border-border rounded-2xl p-6 text-center">
                      <QrCode className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Disponível após quitação total
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

function Info4({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className="size-3" /> {label}
      </div>
      <p className="font-bold text-sm mt-1 truncate">{value}</p>
    </div>
  );
}

function EmbarqueSection({
  ponto,
  pontos,
  seatSelected,
  podeEscolher,
  isVinculadoOuComprador,
  pago,
  onSelect,
}: {
  pax: any;
  ponto: any;
  pontos: any[];
  seatSelected: boolean;
  podeEscolher: boolean;
  isVinculadoOuComprador: boolean;
  pago: number;
  onSelect: (pontoId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const canEdit = seatSelected && podeEscolher && isVinculadoOuComprador && pontos.length > 0;
  const showList = canEdit && (!ponto || editing);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <MapPinned className="size-4 text-neon-pink" />
          <span className="text-sm font-bold">Embarque</span>
        </div>
        {ponto && !editing ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neon-green font-bold">✓ Confirmado</span>
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-[11px] font-bold px-2 py-1 rounded-lg bg-background/60 border border-border hover:border-neon-pink/40"
              >
                Trocar
              </button>
            )}
          </div>
        ) : !seatSelected ? (
          <span className="text-[11px] text-muted-foreground">Escolha a poltrona primeiro</span>
        ) : canEdit ? (
          <span className="text-[11px] text-muted-foreground">Escolha abaixo</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {ponto && !editing && (
        <div className="bg-neon-green/10 border border-neon-green/30 rounded-2xl p-3 text-sm">
          <p className="font-bold">{ponto.nome}</p>
          {ponto.endereco && <p className="text-xs text-muted-foreground">{ponto.endereco}</p>}
          {ponto.horario && <p className="text-xs text-neon-green mt-1">⏰ {ponto.horario}</p>}
        </div>
      )}

      {showList && (
        <ul className="space-y-2">
          {pontos.map((pt) => {
            const selected = ponto?.id === pt.id;
            return (
              <li key={pt.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(pt.id);
                    setEditing(false);
                  }}
                  className={`w-full text-left rounded-2xl p-3 border transition ${
                    selected
                      ? "bg-neon-pink/10 border-neon-pink/60"
                      : "bg-background/40 border-border hover:border-neon-pink/40"
                  }`}
                >
                  <p className="font-bold text-sm">{pt.nome}</p>
                  {pt.endereco && <p className="text-xs text-muted-foreground">{pt.endereco}</p>}
                  {pt.horario && <p className="text-[11px] text-neon-pink">⏰ {pt.horario}</p>}
                </button>
              </li>
            );
          })}
          {ponto && (
            <li>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="w-full text-xs text-muted-foreground py-2"
              >
                Cancelar
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function ReservaIngressosCard({
  pedidos,
  pago,
  onChanged,
}: {
  pedidos: any[];
  pago: number;
  onChanged: () => void;
}) {
  return (
    <div className="glass rounded-3xl p-5 mb-5 border border-neon-pink/30">
      <div className="flex items-center gap-2 mb-3">
        <Ticket className="size-5 text-neon-pink" />
        <h3 className="font-display font-bold">Ingresso / Combo</h3>
      </div>
      <ul className="space-y-3">
        {pedidos.map((p) => (
          <PedidoTimeline key={p.id} pedido={p} pago={pago > 0} onChanged={onChanged} />
        ))}
      </ul>
    </div>
  );
}

function PedidoTimeline({ pedido, pago, onChanged }: { pedido: any; pago: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const status = pedido.status as string;
  const jaEnviado = ["enviado", "emitido", "recebido", "nao_recebido"].includes(status);
  const finalizado = status === "recebido";
  const naoRecebido = status === "nao_recebido";
  const pagoConfirmado = jaEnviado || pago;
  const podeConfirmar = status === "enviado" || status === "emitido";

  async function marcar(novo: "recebido" | "nao_recebido") {
    setBusy(true);
    try {
      const patch: any = { status: novo };
      if (novo === "recebido") patch.recebido_em = new Date().toISOString();
      else patch.nao_recebido_em = new Date().toISOString();
      const { error } = await supabase.from("pedidos_itens").update(patch).eq("id", pedido.id);
      if (error) throw error;
      toast.success(novo === "recebido" ? "Recebimento confirmado." : "Aviso enviado ao organizador.");
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao atualizar.");
    } finally {
      setBusy(false);
    }
  }

  const steps = [
    { key: "pedido", label: "Pedido feito", icon: CheckCircle2, done: true },
    { key: "pago", label: "Pagamento confirmado", icon: Wallet, done: pagoConfirmado },
    { key: "enviado", label: "Ingresso enviado", icon: Mail, done: jaEnviado, ts: pedido.enviado_em },
    { key: "recebido", label: "Ingresso recebido", icon: ThumbsUp, done: finalizado, alert: naoRecebido, ts: pedido.recebido_em },
  ];

  return (
    <li className="rounded-2xl bg-background/40 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink grid place-items-center shrink-0">
          <Package className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight truncate">{pedido.item?.nome ?? "Item"}</p>
          <p className="text-xs text-muted-foreground">
            {pedido.quantidade}× · R$ {Number(pedido.valor_total).toFixed(2)}
          </p>
        </div>
        <StatusPill status={status} />
      </div>

      <ol className="space-y-1.5 mb-3">
        {steps.map((s) => {
          const Icon = s.alert ? AlertTriangle : s.done ? s.icon : CircleDot;
          const cls = s.alert
            ? "text-red-400"
            : s.done
            ? "text-neon-green"
            : "text-muted-foreground/60";
          return (
            <li key={s.key} className="flex items-center gap-2 text-xs">
              <Icon className={`h-3.5 w-3.5 shrink-0 ${cls}`} />
              <span className={s.done || s.alert ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
              {s.ts && (
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {new Date(s.ts).toLocaleDateString("pt-BR")}
                </span>
              )}
            </li>
          );
        })}
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
          <button onClick={() => marcar("recebido")} disabled={busy} className="ml-2 underline font-bold">
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

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { tone: string; label: string }> = {
    pendente: { tone: "bg-yellow-500/15 text-yellow-400", label: "Aguardando" },
    emitido: { tone: "bg-neon-purple/15 text-neon-purple", label: "Emitido" },
    enviado: { tone: "bg-neon-green/15 text-neon-green", label: "Enviado" },
    recebido: { tone: "bg-neon-green/20 text-neon-green", label: "Recebido" },
    nao_recebido: { tone: "bg-red-500/15 text-red-400", label: "Não recebido" },
  };
  const s = map[status] ?? map.pendente;
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${s.tone}`}>{s.label}</span>;
}
