import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Shell, Pill } from "@/components/passageiro/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { Calendar, MapPin, Loader2, Sparkles, Ticket, Compass, X, Plus, Minus, Users } from "lucide-react";

export const Route = createFileRoute("/passageiro/")({
  component: MinhasViagens,
});

type Excursao = {
  id: string;
  titulo: string;
  destino: string;
  data_evento: string;
  preco: number;
  cor: string | null;
  status: string;
  total_vagas: number;
  banner_url: string | null;
};

type MinhaReserva = {
  id: string;
  quantidade: number;
  total_price: number;
  amount_paid: number;
  payment_status: string;
  excursao: Excursao | null;
};

type Pax = { nome: string; email: string; titular: boolean };

function MinhasViagens() {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"minhas" | "disponiveis">("minhas");
  const [reservando, setReservando] = useState(false);
  const [modalEx, setModalEx] = useState<Excursao | null>(null);
  const [step, setStep] = useState<"qtd" | "pax">("qtd");
  const [qtd, setQtd] = useState(1);
  const [paxs, setPaxs] = useState<Pax[]>([]);

  const { data: reservas = [], isLoading: loadingMinhas } = useQuery({
    queryKey: ["minhas-reservas", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservas")
        .select("id, quantidade, total_price, amount_paid, payment_status, excursao:excursoes!reservas_excursao_id_fkey(id,titulo,destino,data_evento,preco,cor,status,total_vagas,banner_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MinhaReserva[];
    },
  });

  const { data: disponiveis = [], isLoading: loadingDisp } = useQuery({
    queryKey: ["excursoes-publicadas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("excursoes")
        .select("id,titulo,destino,data_evento,preco,cor,status,total_vagas,banner_url")
        .eq("status", "publicada")
        .order("data_evento", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Excursao[];
    },
  });
  useRealtimeSync(
    `minhas-reservas-${user?.id ?? "anon"}`,
    user
      ? [
          { table: "reservas", filter: `comprador_id=eq.${user.id}` },
          { table: "passageiros", filter: `user_id=eq.${user.id}` },
          { table: "excursoes" },
        ]
      : [{ table: "excursoes" }],
    [["minhas-reservas", user?.id], ["excursoes-publicadas"]],
  );


  function openReserva(ex: Excursao) {
    setModalEx(ex);
    setStep("qtd");
    setQtd(1);
    setPaxs([
      {
        nome: user?.user_metadata?.full_name || user?.email || "",
        email: user?.email || "",
        titular: true,
      },
    ]);
  }

  function avancarDaQtd() {
    const next: Pax[] = [];
    for (let i = 0; i < qtd; i++) {
      if (i === 0) {
        next.push(paxs[0] || { nome: user?.user_metadata?.full_name || user?.email || "", email: user?.email || "", titular: true });
      } else {
        next.push(paxs[i] || { nome: "", email: "", titular: false });
      }
    }
    setPaxs(next);
    setStep("pax");
  }

  async function confirmar() {
    if (!user || !modalEx) return;
    for (let i = 0; i < paxs.length; i++) {
      const p = paxs[i];
      if (!p.nome.trim() || !p.email.trim()) {
        alert(`Preencha nome e email do passageiro ${i + 1}.`);
        return;
      }
    }
    setReservando(true);
    try {
      const { data, error } = await supabase.rpc("criar_reserva_grupo", {
        p_excursao_id: modalEx.id,
        p_passageiros: paxs.map((p) => ({
          nome: p.nome.trim(),
          email: p.email.trim(),
          titular: p.titular,
        })),
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["minhas-reservas"] });
      setModalEx(null);
      const reservaId = data as unknown as string;
      navigate({ to: "/passageiro/pagamentos", search: { reserva: reservaId } as any });
    } catch (err: any) {
      alert(err.message ?? "Erro ao reservar");
    } finally {
      setReservando(false);
    }
  }

  const idsMinhas = new Set(reservas.map((r) => r.excursao?.id).filter(Boolean));

  return (
    <Shell title="Suas viagens" subtitle="Excursões SoltaTrip">
      <div className="mb-6 glass rounded-3xl p-5 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 size-40 rounded-full bg-neon-pink/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <Sparkles className="size-5 text-neon-pink" />
          <div>
            <p className="text-xs text-muted-foreground">Bem-vindo de volta</p>
            <h2 className="font-display font-bold text-xl">Pronto pra próxima? 🚌</h2>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-5 glass rounded-2xl p-1">
        <TabBtn active={tab === "minhas"} onClick={() => setTab("minhas")} icon={Ticket} label={`Minhas (${reservas.length})`} />
        <TabBtn active={tab === "disponiveis"} onClick={() => setTab("disponiveis")} icon={Compass} label={`Disponíveis (${disponiveis.length})`} />
      </div>

      {tab === "minhas" ? (
        authLoading || loadingMinhas ? (
          <Loading />
        ) : reservas.length === 0 ? (
          <Empty title="Você ainda não reservou nenhuma viagem" cta="Ver excursões disponíveis" onCta={() => setTab("disponiveis")} />
        ) : (
          <ul className="space-y-4">
            {reservas.map((r) => {
              if (!r.excursao) return null;
              const pago = Number(r.amount_paid) || 0;
              const total = Number(r.total_price) || 0;
              const pct = total > 0 ? Math.min(100, Math.round((pago / total) * 100)) : 0;
              const cancelada = r.excursao.status === "cancelada";
              const tone = cancelada ? "yellow" : r.payment_status === "paid" ? "green" : r.payment_status === "partial_payment" ? "purple" : "yellow";
              const label = cancelada
                ? "Excursão cancelada"
                : r.payment_status === "paid"
                ? "Quitado"
                : r.payment_status === "partial_payment"
                ? `${pct}% pago`
                : "Aguardando";
              return (
                <li key={r.id}>
                  <Link to="/passageiro/reserva/$id" params={{ id: r.id }} className="block">
                    <ExcursaoCard
                      ex={r.excursao}
                      title={r.excursao.titulo}
                      badge={<Pill tone={tone as any}>{label}</Pill>}
                      tag={r.quantidade > 1 ? `${r.quantidade} passageiros` : null}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )
      ) : loadingDisp ? (
        <Loading />
      ) : disponiveis.length === 0 ? (
        <Empty title="Nenhuma excursão publicada no momento" />
      ) : (
        <ul className="space-y-4">
          {disponiveis.map((ex) => (
            <ExcursaoCard
              key={ex.id}
              ex={ex}
              badge={<Pill tone="purple">R$ {Number(ex.preco).toFixed(0)}</Pill>}
              action={
                idsMinhas.has(ex.id) ? (
                  <span className="text-xs font-semibold text-neon-green">✓ Já reservado</span>
                ) : (
                  <button
                    onClick={() => openReserva(ex)}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-primary text-primary-foreground glow-primary hover:opacity-90 inline-flex items-center gap-1"
                  >
                    Reservar
                  </button>
                )
              }
            />
          ))}
        </ul>
      )}

      {modalEx && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="glass w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-background/95 backdrop-blur p-5 flex items-center justify-between border-b border-border">
              <div>
                <p className="text-xs text-muted-foreground">{step === "qtd" ? "Reservar" : "Dados dos passageiros"}</p>
                <h3 className="font-display font-bold text-lg leading-tight">{modalEx.titulo}</h3>
              </div>
              <button onClick={() => setModalEx(null)} className="p-2 rounded-full hover:bg-muted">
                <X className="size-5" />
              </button>
            </div>

            {step === "qtd" ? (
              <div className="p-5 space-y-5">
                <p className="text-xs text-muted-foreground">Quantas passagens?</p>
                <div className="flex items-center justify-between bg-background/40 rounded-2xl p-3">
                  <button onClick={() => setQtd(Math.max(1, qtd - 1))} className="size-10 grid place-items-center rounded-xl bg-muted">
                    <Minus className="size-4" />
                  </button>
                  <div className="text-center">
                    <p className="font-display font-black text-4xl">{qtd}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Total: R$ {(Number(modalEx.preco) * qtd).toFixed(2)}
                    </p>
                  </div>
                  <button onClick={() => setQtd(Math.min(10, qtd + 1))} className="size-10 grid place-items-center rounded-xl bg-primary text-primary-foreground">
                    <Plus className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setQtd(n)}
                      className={`py-2 rounded-xl text-sm font-bold ${qtd === n ? "bg-neon-pink text-primary-foreground" : "bg-background/40 text-muted-foreground"}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Você é o titular. Uma única reserva é criada com pagamento consolidado e poltrona/embarque/QR Code individuais por passageiro.
                </p>
                <button
                  onClick={avancarDaQtd}
                  className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground glow-primary"
                >
                  Continuar
                </button>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="size-4" /> {qtd} passageiro{qtd > 1 ? "s" : ""} · Total R$ {(Number(modalEx.preco) * qtd).toFixed(2)}
                </div>
                {paxs.map((p, i) => (
                  <div key={i} className="bg-background/40 rounded-2xl p-3 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-neon-pink">
                      Passageiro {i + 1} {p.titular && <span className="text-neon-green normal-case">· você (titular)</span>}
                    </p>
                    <input
                      value={p.nome}
                      onChange={(ev) => {
                        const next = [...paxs];
                        next[i] = { ...p, nome: ev.target.value };
                        setPaxs(next);
                      }}
                      placeholder="Nome completo"
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm"
                    />
                    <input
                      value={p.email}
                      onChange={(ev) => {
                        const next = [...paxs];
                        next[i] = { ...p, email: ev.target.value };
                        setPaxs(next);
                      }}
                      type="email"
                      placeholder={p.titular ? "Seu email" : "Email (para enviar acesso)"}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm"
                      disabled={p.titular}
                    />
                  </div>
                ))}
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep("qtd")}
                    className="flex-1 h-12 rounded-2xl font-bold bg-background/40 text-muted-foreground"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={confirmar}
                    disabled={reservando}
                    className="flex-1 h-12 rounded-2xl font-bold bg-primary text-primary-foreground glow-primary disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {reservando && <Loader2 className="size-4 animate-spin" />}
                    Criar reserva
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
        active ? "bg-gradient-to-br from-neon-purple/30 to-neon-pink/20 text-neon-pink" : "text-muted-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function ExcursaoCard({
  ex,
  badge,
  action,
  title,
  tag,
}: {
  ex: Excursao;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  title?: string;
  tag?: string | null;
}) {
  return (
    <article className="glass rounded-3xl overflow-hidden">
      <div
        className="relative h-36"
        style={
          ex.banner_url
            ? { backgroundImage: `url(${ex.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: `linear-gradient(135deg, ${ex.cor ?? "#a855f7"}, #ec4899)` }
        }
      >
        {!ex.banner_url && <div className="absolute inset-0 grid-bg opacity-40" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
        {tag && (
          <div className="absolute top-3 left-3">
            <Pill tone="purple">{tag}</Pill>
          </div>
        )}
        {badge && <div className="absolute bottom-3 right-3">{badge}</div>}
      </div>
      <div className="p-4">
        <h3 className="font-display font-bold text-lg leading-tight">{title ?? ex.titulo}</h3>
        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><MapPin className="size-4" /> {ex.destino}</span>
          <span className="flex items-center gap-1.5"><Calendar className="size-4" /> {new Date(ex.data_evento).toLocaleDateString("pt-BR")}</span>
        </div>
        {action && <div className="mt-4 flex justify-end">{action}</div>}
      </div>
    </article>
  );
}

function Loading() {
  return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
}

function Empty({ title, cta, onCta }: { title: string; cta?: string; onCta?: () => void }) {
  return (
    <div className="glass rounded-3xl p-10 text-center">
      <p className="text-sm text-muted-foreground">{title}</p>
      {cta && (
        <button onClick={onCta} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground glow-primary">
          {cta}
        </button>
      )}
    </div>
  );
}
