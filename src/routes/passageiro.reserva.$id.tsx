import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Shell, Pill } from "@/components/passageiro/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Calendar, MapPin, Loader2, Armchair, Wallet, Clock, QrCode, Copy, CheckCircle2, MapPinned, Users } from "lucide-react";

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
        .select("id, quantidade, total_price, amount_paid, payment_status, comprador_id, excursao:excursoes!reservas_excursao_id_fkey(id,titulo,destino,data_evento,horario_saida,horario_retorno,cor,banner_url,preco)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: passageiros = [], refetch: refetchPax } = useQuery({
    queryKey: ["reserva-passageiros", id],
    enabled: !!reserva,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passageiros")
        .select("id, nome, email, status, qr_code, seat_id, assento, ponto_embarque_id, convite_token, user_id, embarcado_em")
        .eq("reserva_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: seats = [] } = useQuery({
    queryKey: ["reserva-seats", reserva?.excursao?.id],
    enabled: !!reserva?.excursao?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seats")
        .select("id, seat_number")
        .eq("excursao_id", reserva!.excursao.id);
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

  if (authLoading || isLoading) {
    return (
      <Shell back="/passageiro" title="Reserva">
        <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
      </Shell>
    );
  }

  if (!reserva) {
    return (
      <Shell back="/passageiro" title="Reserva">
        <div className="glass rounded-3xl p-10 text-center">
          <p className="text-sm text-muted-foreground">Reserva não encontrada.</p>
          <Link to="/passageiro" className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Voltar</Link>
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
  const isComprador = reserva.comprador_id === user?.id;

  const statusMap: Record<string, { tone: any; label: string }> = {
    pending_payment: { tone: "yellow", label: "Aguardando pagamento" },
    partial_payment: { tone: "purple", label: "Pagamento parcial" },
    paid: { tone: "green", label: "Quitado" },
    cancelled: { tone: "muted", label: "Cancelado" },
  };
  const s = statusMap[status] ?? statusMap.pending_payment;

  async function pagar() {
    const v = Number(valor.replace(",", "."));
    if (!v || v <= 0) return alert("Informe um valor válido");
    if (v > restante + 0.001) return alert(`Valor máximo: ${brl(restante)}`);
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
      alert(err.message ?? "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  async function escolherPonto(paxId: string, pontoId: string) {
    const { error } = await supabase.from("passageiros").update({ ponto_embarque_id: pontoId }).eq("id", paxId);
    if (error) return alert(error.message);
    refetchPax();
  }

  function copyInvite(token: string) {
    const url = `${window.location.origin}/invite/passageiro/${token}`;
    navigator.clipboard.writeText(url);
    alert("Link de convite copiado!");
  }

  return (
    <Shell back="/passageiro" title="Reserva" subtitle={ex?.titulo}>
      {/* Banner */}
      <div className="relative rounded-3xl overflow-hidden mb-5 glow-primary">
        <div
          className="h-40 relative"
          style={{
            background: ex?.banner_url ? `url(${ex.banner_url}) center/cover` : `linear-gradient(135deg, ${ex?.cor ?? "#a855f7"}, #ec4899)`,
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
        <Info4 icon={Calendar} label="Data" value={ex?.data_evento ? new Date(ex.data_evento).toLocaleDateString("pt-BR") : "—"} />
        <Info4 icon={MapPin} label="Destino" value={ex?.destino ?? "—"} />
        <Info4 icon={Clock} label="Saída" value={ex?.horario_saida ?? "—"} />
        <Info4 icon={Users} label="Passageiros" value={String(reserva.quantidade)} />
      </div>

      {/* Pagamento consolidado */}
      <div className="glass rounded-3xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="size-5 text-neon-green" />
          <h3 className="font-display font-bold">Pagamento da reserva</h3>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total ({reserva.quantidade} × {brl(Number(ex?.preco) || 0)})</p>
            <p className="font-display font-black text-3xl bg-gradient-to-r from-neon-pink to-neon-green bg-clip-text text-transparent">{brl(total)}</p>
          </div>
          <Pill tone={s.tone}>{pct}%</Pill>
        </div>
        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-to-r from-neon-purple to-neon-green transition-all" style={{ width: `${pct}%` }} />
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
                    metodo === m.v ? "bg-gradient-to-br from-neon-purple/30 to-neon-pink/20 text-neon-pink border border-neon-pink/40" : "bg-background/40 text-muted-foreground"
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
            <summary className="text-xs text-muted-foreground cursor-pointer">Histórico ({pagamentos.length})</summary>
            <div className="space-y-2 mt-2">
              {pagamentos.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-xs bg-background/30 rounded-xl p-2">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-neon-green" /> {String(p.metodo).replace("_", " ")}</span>
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
          const podeEscolher = pago > 0 && status !== "cancelled";
          const qrPayload = p.qr_code || p.id;
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload)}`;
          const isPaid = status === "paid";
          const isVinculadoOuComprador = isComprador || p.user_id === user?.id;

          return (
            <div key={p.id} className="glass rounded-3xl overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-neon-purple/15 to-neon-pink/10 border-b border-border flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Passageiro {idx + 1}</p>
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
                    <p className="text-xs text-muted-foreground mb-2">Convide {p.nome} para acessar a própria reserva:</p>
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
                      onClick={() => navigate({ to: "/passageiro/poltrona", search: { pax: p.id } as any })}
                      className="text-xs font-bold px-3 py-2 rounded-xl bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground"
                    >
                      Escolher
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">{pago === 0 ? "Pague para liberar" : "—"}</span>
                  )}
                </div>

                {/* Embarque */}
                <EmbarqueSection
                  pax={p}
                  ponto={ponto}
                  pontos={pontos as any[]}
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
                      <p className="text-[10px] font-mono text-muted-foreground mt-2 break-all">{qrPayload}</p>
                      {p.embarcado_em && (
                        <p className="text-xs text-neon-green mt-2">✓ Embarcado em {new Date(p.embarcado_em).toLocaleString("pt-BR")}</p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-muted/20 border-2 border-dashed border-border rounded-2xl p-6 text-center">
                      <QrCode className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-xs text-muted-foreground">Disponível após quitação total</p>
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
  podeEscolher,
  isVinculadoOuComprador,
  pago,
  onSelect,
}: {
  pax: any;
  ponto: any;
  pontos: any[];
  podeEscolher: boolean;
  isVinculadoOuComprador: boolean;
  pago: number;
  onSelect: (pontoId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const canEdit = podeEscolher && isVinculadoOuComprador && pontos.length > 0;
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
        ) : canEdit ? (
          <span className="text-[11px] text-muted-foreground">Escolha abaixo</span>
        ) : (
          <span className="text-xs text-muted-foreground">{pago === 0 ? "Pague para liberar" : "—"}</span>
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
