import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Shell, Pill } from "@/components/passageiro/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { Copy, Loader2, CheckCircle2, Armchair, QrCode, ExternalLink, CreditCard, ChevronRight, ArrowLeft, Calendar } from "lucide-react";
// notify removido — payment.submitted é emitido pela trigger DB ao inserir em `pagamentos`.
import { emitSync } from "@/lib/sync/bus";

type Search = { reserva?: string };

export const Route = createFileRoute("/passageiro/pagamentos")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    reserva: typeof s.reserva === "string" ? s.reserva : undefined,
  }),
  component: Pagamentos,
});

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Pagamentos() {
  const { user, loading: authLoading } = useAuth();
  const { reserva: reservaParam } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [metodo, setMetodo] = useState<"pix" | "pix_parcelado" | "debito" | "credito">("pix");
  const [valor, setValor] = useState<string>("");
  const [parcelas, setParcelas] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [pagador, setPagador] = useState<"" | "eu" | "outra">("");
  const [pagadorNome, setPagadorNome] = useState("");

  const { data: reservas, isLoading } = useQuery({
    queryKey: ["reservas-pagto", user?.id, reservaParam],
    enabled: !!user,
    queryFn: async () => {
      // ISOLAMENTO: só reservas do próprio usuário (comprador ou passageiro vinculado).
      const { data: paxLinks } = await supabase
        .from("passageiros")
        .select("reserva_id")
        .eq("user_id", user!.id);
      const linkedIds = Array.from(
        new Set((paxLinks ?? []).map((p: any) => p.reserva_id).filter(Boolean)),
      ) as string[];

      let q = supabase
        .from("reservas")
        .select(
          "id, quantidade, total_price, amount_paid, payment_status, comprador_id, excursao:excursoes!reservas_excursao_id_fkey(id, titulo, destino, preco, data_evento, banner_url, cor)",
        );
      if (linkedIds.length > 0) {
        q = q.or(`comprador_id.eq.${user!.id},id.in.(${linkedIds.join(",")})`);
      } else {
        q = q.eq("comprador_id", user!.id);
      }
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as any[]).filter(
        (r) => r.comprador_id === user!.id || linkedIds.includes(r.id),
      );
    },
  });

  const reservaAtiva: any = useMemo(() => {
    if (!reservas?.length) return null;
    if (reservaParam) return reservas.find((r: any) => r.id === reservaParam) ?? reservas[0];
    if (reservas.length === 1) return reservas[0];
    // Múltiplas reservas e nenhuma selecionada → mostra lista.
    return null;
  }, [reservas, reservaParam]);

  const reservaIds = (reservas ?? []).map((r: any) => r.id);
  const { data: pendentesPorReserva = {} } = useQuery({
    queryKey: ["pend-pags", user?.id, reservaIds.join(",")],
    enabled: !reservaAtiva && reservaIds.length > 1,
    queryFn: async () => {
      const { data } = await supabase
        .from("pagamentos")
        .select("reserva_id, valor")
        .eq("status", "pendente")
        .in("reserva_id", reservaIds);
      const map: Record<string, number> = {};
      (data ?? []).forEach((p: any) => {
        const k = p.reserva_id as string;
        map[k] = (map[k] ?? 0) + Number(p.valor || 0);
      });
      return map;
    },
  });

  const { data: passageiros = [] } = useQuery({
    queryKey: ["pagto-passageiros", reservaAtiva?.id],
    enabled: !!reservaAtiva?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passageiros")
        .select("id, seat_id, ponto_embarque_id")
        .eq("reserva_id", reservaAtiva.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pagamentos = [] } = useQuery({
    queryKey: ["pagamentos", reservaAtiva?.id],
    enabled: !!reservaAtiva?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos")
        .select("id, valor, metodo, status, created_at, parcelas")
        .eq("reserva_id", reservaAtiva.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: payInfo } = useQuery({
    queryKey: ["organizer-payment-info", reservaAtiva?.excursao?.id],
    enabled: !!reservaAtiva?.excursao?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_excursao_payment_info", {
        p_excursao_id: reservaAtiva.excursao.id,
      });
      if (error) throw error;
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
    `pagto-${user?.id ?? "anon"}-${reservaAtiva?.id ?? "none"}`,
    reservaAtiva?.id
      ? [
          { table: "reservas", filter: `id=eq.${reservaAtiva.id}` },
          { table: "passageiros", filter: `reserva_id=eq.${reservaAtiva.id}` },
          { table: "pagamentos", filter: `reserva_id=eq.${reservaAtiva.id}` },
        ]
      : [],
    [
      ["reservas-pagto", user?.id, reservaParam],
      ["pagto-passageiros", reservaAtiva?.id],
      ["pagamentos", reservaAtiva?.id],
    ],
  );

  if (authLoading || isLoading) {
    return (
      <Shell title="Pagamentos">
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  if (!reservaAtiva) {
    if ((reservas?.length ?? 0) > 1) {
      // Lista de excursões para o usuário escolher.
      return (
        <Shell title="Pagamentos" subtitle="Escolha uma excursão">
          <ul className="space-y-4">
            {reservas!.map((r: any) => {
              const ex = r.excursao;
              if (!ex) return null;
              const totalR = Number(r.total_price) || 0;
              const pagoR = Number(r.amount_paid) || 0;
              const restanteR = Math.max(0, totalR - pagoR);
              const pendValor = (pendentesPorReserva as Record<string, number>)[r.id] ?? 0;
              let tone: any = "yellow";
              let label = "Pendente";
              if (r.payment_status === "paid") {
                tone = "green"; label = "Quitado";
              } else if (r.payment_status === "cancelled") {
                tone = "muted"; label = "Cancelado";
              } else if (pendValor > 0) {
                tone = "yellow"; label = "Em análise";
              } else if (pagoR > 0 && restanteR > 0) {
                tone = "purple"; label = `Falta ${brl(restanteR)}`;
              } else if (restanteR > 0) {
                tone = "yellow"; label = `Falta ${brl(restanteR)}`;
              }
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/passageiro/pagamentos", search: { reserva: r.id } as any })}
                    className="w-full text-left rounded-3xl overflow-hidden glass border border-transparent hover:border-neon-pink/40 transition"
                  >
                    <div
                      className="h-28 relative"
                      style={{
                        background: ex.banner_url
                          ? `url(${ex.banner_url}) center/cover`
                          : `linear-gradient(135deg, ${ex.cor ?? "#a855f7"}, #ec4899)`,
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
                      <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
                        <h3 className="font-display font-black text-lg drop-shadow leading-tight truncate">{ex.titulo}</h3>
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Calendar className="size-3" />
                          {ex.data_evento ? new Date(ex.data_evento).toLocaleDateString("pt-BR") : "—"}
                        </div>
                        <div className="mt-1"><Pill tone={tone}>{label}</Pill></div>
                      </div>
                      <ChevronRight className="size-5 text-muted-foreground shrink-0" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Shell>
      );
    }
    return (
      <Shell title="Pagamentos">
        <div className="glass rounded-3xl p-10 text-center">
          <p className="text-sm text-muted-foreground">Você ainda não possui reservas.</p>
          <button
            onClick={() => navigate({ to: "/passageiro" })}
            className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Ver excursões
          </button>
        </div>
      </Shell>
    );
  }

  const total = Number(reservaAtiva.total_price) || 0;
  const pago = Number(reservaAtiva.amount_paid) || 0;
  const restante = Math.max(0, total - pago);
  const pct = total > 0 ? Math.min(100, Math.round((pago / total) * 100)) : 0;
  const status = reservaAtiva.payment_status as string;
  const passageirosList = passageiros as any[];
  const faltamPoltronas = passageirosList.some((p) => !p.seat_id);
  const faltamEmbarques = passageirosList.some((p) => p.seat_id && !p.ponto_embarque_id);

  async function pagar() {
    if (!reservaAtiva) return;
    const v = Number(valor.replace(",", "."));
    if (!v || v <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (v > restante + 0.001) {
      toast.error(`Valor máximo: ${brl(restante)}`);
      return;
    }
    const isPix = metodo === "pix" || metodo === "pix_parcelado";
    if (isPix && !pagador) {
      toast.error("Informe quem realizará o PIX");
      return;
    }
    const nomePagador = pagador === "outra" ? pagadorNome.trim() : "";
    if (isPix && pagador === "outra" && !nomePagador) {
      toast.error("Digite o nome de quem fará o PIX");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("pagamentos").insert({
        reserva_id: reservaAtiva.id,
        excursao_id: reservaAtiva.excursao.id,
        valor: v,
        metodo,
        parcelas: metodo === "credito" ? parcelas : 1,
        status: "pendente",
        pagador_nome: isPix && pagador === "outra" ? nomePagador : null,
      } as any);
      if (error) throw error;
      setValor("");
      setPagador("");
      setPagadorNome("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["pagamentos"] }),
        qc.invalidateQueries({ queryKey: ["reservas-pagto"] }),
        qc.invalidateQueries({ queryKey: ["pagto-passageiros"] }),
      ]);
      toast.success("Pagamento enviado! Aguardando confirmação manual do organizador.");
      emitSync("pagamento");
      // payment.submitted dispara via trigger DB para organizador raiz + sócios.
      void brl(v);

      // Fluxo automático: pular tela da reserva e abrir direto poltrona/embarque
      // do primeiro passageiro pendente. Após concluir, /passageiro/poltrona
      // encadeia o próximo ou volta para /passageiro/reserva/$id.
      if (faltamPoltronas || faltamEmbarques) {
        const proximo = passageirosList.find((p) => !p.seat_id || !p.ponto_embarque_id);
        if (proximo) {
          navigate({ to: "/passageiro/poltrona", search: { pax: proximo.id } as any });
        } else {
          navigate({ to: "/passageiro/reserva/$id", params: { id: reservaAtiva.id } });
        }
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao registrar pagamento");
    } finally {
      setSubmitting(false);
    }
  }


  const statusLabel: Record<string, { tone: any; label: string }> = {
    pending_payment: { tone: "yellow", label: "Aguardando pagamento" },
    partial_payment: { tone: "purple", label: "Pagamento parcial" },
    paid: { tone: "green", label: "Quitado" },
    cancelled: { tone: "muted", label: "Cancelado" },
  };
  const s = statusLabel[status] ?? statusLabel.pending_payment;
  const pendentesConfirmacao = (pagamentos as any[]).filter((p) => p.status === "pendente");
  const valorPendenteConfirmacao = pendentesConfirmacao.reduce((sum, p) => sum + Number(p.valor || 0), 0);
  const displayStatus = pendentesConfirmacao.length > 0 && status !== "paid"
    ? { tone: "yellow" as any, label: "Aguardando confirmação" }
    : s;

  return (
    <Shell title="Pagamentos" subtitle={reservaAtiva.excursao.titulo}>
      {(reservas?.length ?? 0) > 1 && (
        <button
          type="button"
          onClick={() => navigate({ to: "/passageiro/pagamentos", search: {} as any })}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Trocar excursão
        </button>
      )}
      {/* Resumo */}
      <div className="glass rounded-3xl p-6 mb-5 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 size-40 rounded-full bg-neon-green/20 blur-3xl" />
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Total da viagem</p>
          <Pill tone={displayStatus.tone}>{displayStatus.label}</Pill>
        </div>
        <p className="font-display font-black text-4xl bg-gradient-to-r from-neon-pink to-neon-green bg-clip-text text-transparent">
          {brl(total)}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon-purple to-neon-green transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-bold text-neon-green">{pct}%</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {brl(pago)} confirmados · {brl(restante)} restantes
        </p>
        {pendentesConfirmacao.length > 0 && (
          <p className="text-xs text-yellow-300 mt-1">
            {brl(valorPendenteConfirmacao)} aguardando confirmação do organizador
          </p>
        )}
      </div>

      {/* Aviso sobre confirmação manual */}
      {pendentesConfirmacao.length > 0 && (
        <div className="mb-5 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <p className="text-sm font-bold text-yellow-300 mb-1">Pagamento em análise</p>
          <p className="text-xs text-muted-foreground">
            Seu pagamento foi enviado e será validado manualmente pelo organizador.
            Sua poltrona e embarque continuam reservados. O QR Code de embarque será liberado após a confirmação.
          </p>
        </div>
      )}

      {/* Botão poltrona — abre a reserva centralizada com todos os passageiros */}
      {(pago > 0 || pendentesConfirmacao.length > 0) && status !== "cancelled" && (faltamPoltronas || faltamEmbarques) && (
        <button
          onClick={() => {
            const proximo = passageirosList.find((p) => !p.seat_id || !p.ponto_embarque_id);
            if (proximo) {
              navigate({ to: "/passageiro/poltrona", search: { pax: proximo.id } as any });
            } else {
              navigate({ to: "/passageiro/reserva/$id", params: { id: reservaAtiva.id } });
            }
          }}
          className="w-full mb-5 flex items-center justify-center gap-2 h-14 rounded-2xl font-display font-bold bg-gradient-to-r from-neon-green to-neon-purple text-primary-foreground glow-primary"
        >
          <Armchair className="size-5" />
          {faltamPoltronas ? "Escolher poltronas e embarques" : "Confirmar pontos de embarque"}
        </button>
      )}
      {passageiros.length > 0 && passageirosList.every((p) => p.seat_id && p.ponto_embarque_id) && (
        <button
          onClick={() =>
            navigate({ to: "/passageiro/reserva/$id", params: { id: reservaAtiva.id } })
          }
          className="w-full mb-5 flex items-center justify-center gap-2 h-14 rounded-2xl font-display font-bold bg-neon-green/15 text-neon-green border border-neon-green/30 hover:bg-neon-green/25 transition"
        >
          <Armchair className="size-5" />
          Ver poltronas e embarques
        </button>
      )}

      {/* Form de pagamento */}
      {restante > 0 && status !== "cancelled" && (
        <div className="glass rounded-3xl p-5 mb-5">
          <h3 className="font-display font-bold mb-3">Fazer pagamento</h3>

          <label className="text-xs text-muted-foreground">Método</label>
          <div className="grid grid-cols-2 gap-2 mt-1 mb-3">
            {[
              { v: "pix", l: "PIX (total)" },
              { v: "pix_parcelado", l: "PIX fracionado" },
              { v: "debito", l: "Débito" },
              { v: "credito", l: "Crédito" },
            ].map((m) => (
              <button
                key={m.v}
                onClick={() => {
                  setMetodo(m.v as any);
                  if (m.v !== "pix_parcelado") setValor(restante.toFixed(2));
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

          {metodo === "credito" && (
            <>
              <label className="text-xs text-muted-foreground">Parcelas</label>
              <select
                value={parcelas}
                onChange={(e) => setParcelas(Number(e.target.value))}
                className="w-full mt-1 mb-3 h-11 rounded-xl bg-background/40 px-3 text-sm"
              >
                {[1, 2, 3, 4, 6, 10, 12].map((n) => (
                  <option key={n} value={n}>
                    {n}x de {brl(restante / n)}
                  </option>
                ))}
              </select>
            </>
          )}

          <label className="text-xs text-muted-foreground">Valor (R$)</label>
          <input
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={restante.toFixed(2)}
            className="w-full mt-1 mb-3 h-12 rounded-xl bg-background/40 px-4 text-sm"
          />

          {(metodo === "pix" || metodo === "pix_parcelado") && (
            <div className="space-y-3 mb-3">
              {payInfo?.pix_qr_url && (
                <div className="bg-background/50 rounded-2xl p-3 flex flex-col items-center">
                  <img src={payInfo.pix_qr_url} alt="QR Code Pix" className="size-44 object-contain rounded-xl bg-white p-2" />
                  <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                    <QrCode className="size-3" /> Escaneie no app do banco
                  </p>
                </div>
              )}
              {payInfo?.pix_key ? (
                <div className="bg-background/50 rounded-2xl px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Chave Pix {payInfo.pix_recipient ? `· ${payInfo.pix_recipient}` : ""}
                  </p>
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono truncate">{payInfo.pix_key}</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(payInfo.pix_key!);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="ml-2 size-9 grid place-items-center rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink text-primary-foreground shrink-0"
                    >
                      <Copy className="size-4" />
                    </button>
                  </div>
                </div>
              ) : (
                !payInfo?.pix_qr_url && (
                  <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-200">
                    O organizador ainda não cadastrou uma chave Pix. Entre em contato pelo WhatsApp da excursão.
                  </div>
                )
              )}
            </div>
          )}
          {copied && <p className="text-xs text-neon-green mb-2">Chave copiada!</p>}

          {(metodo === "debito" || metodo === "credito") && (
            <div className="space-y-2 mb-3">
              {(payInfo?.payment_links ?? []).length > 0 ? (
                (payInfo!.payment_links ?? []).map((l, i) => (
                  <a
                    key={i}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-2xl bg-background/50 px-4 py-3 border border-border hover:border-neon-pink/50 transition"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <CreditCard className="size-4 text-neon-pink" />
                      {l.label || "Pagar com cartão"}
                    </span>
                    <ExternalLink className="size-4 text-muted-foreground" />
                  </a>
                ))
              ) : (
                <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-200">
                  O organizador ainda não cadastrou link para pagamento com cartão.
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                Após pagar no link externo, registre o valor abaixo para o organizador confirmar.
              </p>
            </div>
          )}


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

      {/* Histórico */}
      <h3 className="font-display font-bold mb-3">Pagamentos realizados</h3>
      {pagamentos.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Nenhum pagamento ainda.
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {pagamentos.map((p: any) => (
            <div key={p.id} className="glass rounded-2xl p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl grid place-items-center bg-neon-green/20 text-neon-green">
                <CheckCircle2 className="size-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold capitalize">{String(p.metodo).replace("_", " ")}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleString("pt-BR")}
                  {p.parcelas > 1 && ` · ${p.parcelas}x`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display font-bold">{brl(Number(p.valor))}</p>
                <Pill tone="green">{p.status}</Pill>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
