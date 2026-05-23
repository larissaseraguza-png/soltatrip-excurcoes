import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shell, Pill } from "@/components/passageiro/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Calendar,
  MapPin,
  Loader2,
  Armchair,
  Wallet,
  Clock,
  QrCode,
  MessageCircle,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/passageiro/reserva/$id")({
  component: ReservaDetalhes,
});

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ReservaDetalhes() {
  const { id } = useParams({ from: "/passageiro/reserva/$id" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: reserva, isLoading } = useQuery({
    queryKey: ["reserva-detalhe", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passageiros")
        .select(
          "id, nome, status, qr_code, total_price, amount_paid, payment_status, seat_id, assento, embarcado_em, ponto_embarque_id, excursao:excursoes(id,titulo,destino,data_evento,horario_saida,horario_retorno,ponto_embarque,descricao,cor,banner_url,preco)"
        )
        .eq("id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: seat } = useQuery({
    queryKey: ["reserva-seat", reserva?.seat_id],
    enabled: !!reserva?.seat_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seats")
        .select("seat_number")
        .eq("id", reserva!.seat_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: mensagens = [] } = useQuery({
    queryKey: ["reserva-mensagens", reserva?.excursao?.id],
    enabled: !!reserva?.excursao?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens")
        .select("id, autor_nome, conteudo, created_at")
        .eq("excursao_id", reserva!.excursao.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pontos = [] } = useQuery({
    queryKey: ["reserva-pontos", reserva?.excursao?.id],
    enabled: !!reserva?.excursao?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pontos_embarque")
        .select("id, nome, endereco, referencia, horario, ordem")
        .eq("excursao_id", reserva!.excursao.id)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function escolherPonto(pontoId: string) {
    if (!reserva) return;
    const { error } = await supabase
      .from("passageiros")
      .update({ ponto_embarque_id: pontoId })
      .eq("id", reserva.id);
    if (error) {
      alert(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["reserva-detalhe", id] });
  }

  if (isLoading) {
    return (
      <Shell back="/passageiro" title="Detalhes da reserva">
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  if (!reserva) {
    return (
      <Shell back="/passageiro" title="Detalhes da reserva">
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
  const seatLabel = seat?.seat_number ?? reserva.assento ?? null;

  const statusMap: Record<string, { tone: any; label: string }> = {
    pending_payment: { tone: "yellow", label: "Aguardando pagamento" },
    partial_payment: { tone: "purple", label: "Pagamento parcial" },
    paid: { tone: "green", label: "Quitado" },
    cancelled: { tone: "muted", label: "Cancelado" },
  };
  const s = statusMap[status] ?? statusMap.pending_payment;

  const qrPayload = reserva.qr_code || reserva.id;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    qrPayload
  )}`;

  return (
    <Shell back="/passageiro" title="Detalhes da reserva" subtitle={ex?.titulo}>
      {/* Banner */}
      <div className="relative rounded-3xl overflow-hidden mb-5 glow-primary">
        <div
          className="h-44 relative"
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
            <h1 className="font-display font-black text-2xl mt-2 leading-tight">
              {ex?.titulo}
            </h1>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Info4 icon={Calendar} label="Data" value={ex?.data_evento ? new Date(ex.data_evento).toLocaleDateString("pt-BR") : "—"} />
        <Info4 icon={MapPin} label="Destino" value={ex?.destino ?? "—"} />
        <Info4 icon={Clock} label="Saída" value={ex?.horario_saida ?? "—"} />
        <Info4 icon={Clock} label="Retorno" value={ex?.horario_retorno ?? "—"} />
      </div>

      {/* Pagamento */}
      <div className="glass rounded-3xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="size-5 text-neon-green" />
          <h3 className="font-display font-bold">Pagamento</h3>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total da viagem</p>
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
        {status !== "paid" && status !== "cancelled" && (
          <button
            onClick={() =>
              navigate({
                to: "/passageiro/pagamentos",
                search: { reserva: reserva.id } as any,
              })
            }
            className="mt-4 w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground glow-primary"
          >
            {pago > 0 ? "Continuar pagando" : "Pagar agora"}
          </button>
        )}
      </div>

      {/* Poltrona */}
      <div className="glass rounded-3xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Armchair className="size-5 text-neon-purple" />
          <h3 className="font-display font-bold">Sua poltrona</h3>
        </div>
        {seatLabel ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Número</p>
              <p className="font-display font-black text-3xl">{seatLabel}</p>
            </div>
            <button
              onClick={() =>
                navigate({
                  to: "/passageiro/poltrona",
                  search: { reserva: reserva.id } as any,
                })
              }
              className="px-4 h-11 rounded-2xl text-sm font-bold glass"
            >
              Trocar
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              {pago > 0
                ? "Você ainda não escolheu sua poltrona."
                : "Realize um pagamento para liberar a escolha de poltrona."}
            </p>
            {pago > 0 && (
              <button
                onClick={() =>
                  navigate({
                    to: "/passageiro/poltrona",
                    search: { reserva: reserva.id } as any,
                  })
                }
                className="w-full h-12 rounded-2xl font-bold bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground glow-primary"
              >
                Escolher poltrona
              </button>
            )}
          </>
        )}
      </div>

      {/* QR Code */}
      <div className="glass rounded-3xl p-5 mb-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <QrCode className="size-5 text-neon-pink" />
          <h3 className="font-display font-bold">QR Code de embarque</h3>
        </div>
        <div className="mx-auto w-60 h-60 rounded-3xl bg-white p-3 grid place-items-center">
          <img src={qrUrl} alt="QR Code da reserva" className="w-full h-full" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground tracking-widest font-mono">
          {qrPayload}
        </p>
        {reserva.embarcado_em && (
          <p className="mt-2 text-xs text-neon-green">
            ✓ Embarcado em {new Date(reserva.embarcado_em).toLocaleString("pt-BR")}
          </p>
        )}
      </div>

      {/* Embarque */}
      <div className="glass rounded-3xl p-5 mb-5 border-l-4 border-neon-pink">
        <div className="flex items-center gap-2 mb-2">
          <Info className="size-5 text-neon-pink" />
          <h3 className="font-display font-bold">Embarque</h3>
        </div>
        <p className="text-sm font-semibold">{ex?.ponto_embarque ?? "Local a definir"}</p>
        {ex?.horario_saida && (
          <p className="text-xs text-muted-foreground mt-1">
            Chegue 30 min antes · saída {ex.horario_saida}
          </p>
        )}
        {ex?.descricao && (
          <p className="text-sm text-muted-foreground mt-3 whitespace-pre-line">
            {ex.descricao}
          </p>
        )}
      </div>

      {/* Avisos do excursionista */}
      <div className="glass rounded-3xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="size-5 text-neon-green" />
          <h3 className="font-display font-bold">Avisos do excursionista</h3>
        </div>
        {mensagens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aviso ainda.</p>
        ) : (
          <ul className="space-y-3">
            {mensagens.map((m: any) => (
              <li key={m.id} className="bg-background/40 rounded-2xl p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold">{m.autor_nome ?? "Organização"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <p className="text-sm mt-1 whitespace-pre-line">{m.conteudo}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}

function Info4({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <Icon className="size-4 text-neon-pink mb-2" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold text-sm">{value}</p>
    </div>
  );
}
