import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Shell, Pill } from "@/components/passageiro/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Calendar, MapPin, Loader2, Sparkles, Ticket, Compass, X, Plus, Minus } from "lucide-react";

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
};

type MinhaInscricao = {
  id: string;
  status: string;
  payment_status: string;
  amount_paid: number;
  total_price: number;
  nome: string;
  user_id: string | null;
  comprador_id: string | null;
  convite_token: string | null;
  excursao: Excursao | null;
};

type ExtraPax = { nome: string; email: string };

function MinhasViagens() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"minhas" | "disponiveis">("minhas");
  const [reservando, setReservando] = useState(false);
  const [modalEx, setModalEx] = useState<Excursao | null>(null);
  const [qtd, setQtd] = useState(1);
  const [extras, setExtras] = useState<ExtraPax[]>([]);

  const { data: minhas = [], isLoading: loadingMinhas } = useQuery({
    queryKey: ["minhas-inscricoes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passageiros")
        .select("id, status, payment_status, amount_paid, total_price, nome, user_id, comprador_id, convite_token, excursao:excursoes(id,titulo,destino,data_evento,preco,cor,status,total_vagas)")
        .or(`user_id.eq.${user!.id},comprador_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MinhaInscricao[];
    },
  });

  const { data: disponiveis = [], isLoading: loadingDisp } = useQuery({
    queryKey: ["excursoes-publicadas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("excursoes")
        .select("id,titulo,destino,data_evento,preco,cor,status,total_vagas")
        .eq("status", "publicada")
        .order("data_evento", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Excursao[];
    },
  });

  function openReserva(ex: Excursao) {
    setModalEx(ex);
    setQtd(1);
    setExtras([]);
  }

  function setQuantidade(n: number) {
    const clamped = Math.max(1, Math.min(10, n));
    setQtd(clamped);
    const adicionais = clamped - 1;
    setExtras((prev) => {
      const next = [...prev];
      while (next.length < adicionais) next.push({ nome: "", email: "" });
      next.length = adicionais;
      return next;
    });
  }

  async function confirmarReserva() {
    if (!user || !modalEx) return;
    // Validar extras
    for (let i = 0; i < extras.length; i++) {
      const e = extras[i];
      if (!e.nome.trim() || !e.email.trim()) {
        alert(`Preencha nome e email do passageiro ${i + 2}.`);
        return;
      }
    }
    setReservando(true);
    try {
      const titularNome = user.user_metadata?.full_name || user.email || "Passageiro";
      const rows: any[] = [
        {
          excursao_id: modalEx.id,
          user_id: user.id,
          comprador_id: user.id,
          nome: titularNome,
          email: user.email,
          status: "pendente",
          total_price: Number(modalEx.preco) || 0,
          payment_status: "pending_payment",
        },
        ...extras.map((e) => ({
          excursao_id: modalEx.id,
          user_id: null,
          comprador_id: user.id,
          nome: e.nome.trim(),
          email: e.email.trim(),
          status: "pendente",
          total_price: Number(modalEx.preco) || 0,
          payment_status: "pending_payment",
          convite_token: crypto.randomUUID().replace(/-/g, ""),
        })),
      ];
      const { data, error } = await supabase
        .from("passageiros")
        .insert(rows)
        .select("id");
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["minhas-inscricoes"] });
      setModalEx(null);
      // Vai para a primeira reserva (titular) para iniciar pagamento
      const firstId = data?.[0]?.id;
      if (firstId) {
        navigate({ to: "/passageiro/pagamentos", search: { reserva: firstId } as any });
      }
    } catch (err: any) {
      alert(err.message ?? "Erro ao reservar");
    } finally {
      setReservando(false);
    }
  }

  const idsMinhas = new Set(minhas.map((m) => m.excursao?.id).filter(Boolean));

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
        <TabBtn active={tab === "minhas"} onClick={() => setTab("minhas")} icon={Ticket} label={`Minhas (${minhas.length})`} />
        <TabBtn active={tab === "disponiveis"} onClick={() => setTab("disponiveis")} icon={Compass} label={`Disponíveis (${disponiveis.length})`} />
      </div>

      {tab === "minhas" ? (
        loadingMinhas ? (
          <Loading />
        ) : minhas.length === 0 ? (
          <Empty
            title="Você ainda não reservou nenhuma viagem"
            cta="Ver excursões disponíveis"
            onCta={() => setTab("disponiveis")}
          />
        ) : (
          <ul className="space-y-4">
            {minhas.map((m) => {
              if (!m.excursao) return null;
              const pago = Number(m.amount_paid) || 0;
              const total = Number(m.total_price) || 0;
              const pct = total > 0 ? Math.min(100, Math.round((pago / total) * 100)) : 0;
              const tone =
                m.payment_status === "paid"
                  ? "green"
                  : m.payment_status === "partial_payment"
                    ? "purple"
                    : "yellow";
              const label =
                m.payment_status === "paid"
                  ? "Quitado"
                  : m.payment_status === "partial_payment"
                    ? `${pct}% pago`
                    : "Aguardando pagamento";
              const isConvidado = m.comprador_id === user?.id && m.user_id !== user?.id;
              return (
                <li key={m.id}>
                  <Link to="/passageiro/reserva/$id" params={{ id: m.id }} className="block">
                    <ExcursaoCard
                      ex={m.excursao}
                      title={isConvidado ? `${m.excursao.titulo} · ${m.nome}` : m.excursao.titulo}
                      badge={<Pill tone={tone}>{label}</Pill>}
                      tag={isConvidado ? "Convidado" : null}
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
                <p className="text-xs text-muted-foreground">Reservar</p>
                <h3 className="font-display font-bold text-lg leading-tight">{modalEx.titulo}</h3>
              </div>
              <button onClick={() => setModalEx(null)} className="p-2 rounded-full hover:bg-muted">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Quantas vagas?</p>
                <div className="flex items-center justify-between bg-background/40 rounded-2xl p-3">
                  <button onClick={() => setQuantidade(qtd - 1)} className="size-10 grid place-items-center rounded-xl bg-muted">
                    <Minus className="size-4" />
                  </button>
                  <div className="text-center">
                    <p className="font-display font-black text-3xl">{qtd}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Total: R$ {(Number(modalEx.preco) * qtd).toFixed(2)}
                    </p>
                  </div>
                  <button onClick={() => setQuantidade(qtd + 1)} className="size-10 grid place-items-center rounded-xl bg-primary text-primary-foreground">
                    <Plus className="size-4" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Você é o titular da 1ª vaga. Cada vaga gera passageiro, poltrona e QR Code individuais.
                </p>
              </div>

              {extras.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-neon-pink">
                    Passageiros adicionais
                  </p>
                  {extras.map((e, i) => (
                    <div key={i} className="bg-background/40 rounded-2xl p-3 space-y-2">
                      <p className="text-xs font-bold">Passageiro {i + 2}</p>
                      <input
                        value={e.nome}
                        onChange={(ev) => {
                          const next = [...extras];
                          next[i] = { ...e, nome: ev.target.value };
                          setExtras(next);
                        }}
                        placeholder="Nome completo"
                        className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm"
                      />
                      <input
                        value={e.email}
                        onChange={(ev) => {
                          const next = [...extras];
                          next[i] = { ...e, email: ev.target.value };
                          setExtras(next);
                        }}
                        type="email"
                        placeholder="Email (para enviar acesso)"
                        className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={confirmarReserva}
                disabled={reservando}
                className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground glow-primary disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {reservando && <Loader2 className="size-4 animate-spin" />}
                Confirmar e ir para pagamento
              </button>
            </div>
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
      <div className="relative h-32" style={{ background: `linear-gradient(135deg, ${ex.cor ?? "#a855f7"}, #ec4899)` }}>
        <div className="absolute inset-0 grid-bg opacity-40" />
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
