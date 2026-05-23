import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Shell, Pill } from "@/components/passageiro/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Calendar, MapPin, Loader2, Sparkles, Ticket, Compass } from "lucide-react";

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
  excursao: Excursao | null;
};

function MinhasViagens() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"minhas" | "disponiveis">("minhas");
  const [reservando, setReservando] = useState<string | null>(null);

  const { data: minhas = [], isLoading: loadingMinhas } = useQuery({
    queryKey: ["minhas-inscricoes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passageiros")
        .select("id, status, excursao:excursoes(id,titulo,destino,data_evento,preco,cor,status,total_vagas)")
        .eq("user_id", user!.id)
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

  async function reservar(ex: Excursao) {
    if (!user) return;
    setReservando(ex.id);
    try {
      const { data, error } = await supabase
        .from("passageiros")
        .insert({
          excursao_id: ex.id,
          user_id: user.id,
          nome: user.user_metadata?.full_name || user.email || "Passageiro",
          status: "pendente",
          total_price: Number(ex.preco) || 0,
          payment_status: "pending_payment",
        })
        .select("id")
        .single();
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["minhas-inscricoes"] });
      navigate({ to: "/passageiro/pagamentos", search: { reserva: data.id } as any });
    } catch (err: any) {
      alert(err.message ?? "Erro ao reservar");
    } finally {
      setReservando(null);
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
            {minhas.map((m) =>
              m.excursao ? (
                <ExcursaoCard
                  key={m.id}
                  ex={m.excursao}
                  badge={<Pill tone={m.status === "confirmado" ? "green" : "yellow"}>{m.status}</Pill>}
                />
              ) : null,
            )}
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
                    onClick={() => reservar(ex)}
                    disabled={reservando === ex.id}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-primary text-primary-foreground glow-primary hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    {reservando === ex.id && <Loader2 className="h-3 w-3 animate-spin" />}
                    Reservar
                  </button>
                )
              }
            />
          ))}
        </ul>
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

function ExcursaoCard({ ex, badge, action }: { ex: Excursao; badge?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <article className="glass rounded-3xl overflow-hidden">
      <div className="relative h-32" style={{ background: `linear-gradient(135deg, ${ex.cor ?? "#a855f7"}, #ec4899)` }}>
        <div className="absolute inset-0 grid-bg opacity-40" />
        {badge && <div className="absolute bottom-3 right-3">{badge}</div>}
      </div>
      <div className="p-4">
        <h3 className="font-display font-bold text-lg leading-tight">{ex.titulo}</h3>
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
