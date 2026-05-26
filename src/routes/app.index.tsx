import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import {
  Plus, Calendar, MapPin, Users, Loader2, Sparkles, TrendingUp,
  Wallet, AlertCircle, Bus, ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

type Excursao = {
  id: string;
  titulo: string;
  destino: string;
  data_evento: string;
  status: string;
  preco: number;
  total_vagas: number;
  custo_onibus: number;
  cor: string | null;
  banner_url: string | null;
  organizer_id?: string;
  is_owner?: boolean;
};

type PaxRow = { excursao_id: string; total_price: number; amount_paid: number; status: string };

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// Formato SSR-safe: evita hydration mismatch de toLocaleDateString entre server/client
function fmtDateBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function Dashboard() {
  const { user } = useAuth();

  const { data: excursoes, isLoading } = useQuery({
    queryKey: ["excursoes-managed", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      // Inclui excursões próprias E aquelas onde o usuário é sócio (co-organizador).
      const { data, error } = await (supabase as any).rpc("list_managed_excursoes");
      if (error) throw error;
      return (data ?? []) as Excursao[];
    },
  });

  const ids = excursoes?.map((e) => e.id) ?? [];

  const { data: pax } = useQuery({
    queryKey: ["dashboard-pax", user?.id, ids.length],
    enabled: !!user && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passageiros")
        .select("excursao_id,total_price,amount_paid,status")
        .in("excursao_id", ids);
      if (error) throw error;
      return (data ?? []) as PaxRow[];
    },
  });

  useRealtimeSync(
    `excursoes-org-${user?.id ?? "anon"}`,
    user ? [{ table: "excursoes", filter: `organizer_id=eq.${user.id}` }] : [],
    [["excursoes", user?.id]],
  );

  const total = excursoes?.length ?? 0;
  const hoje = new Date().toISOString().slice(0, 10);
  const proximas = (excursoes ?? []).filter((e) => e.data_evento >= hoje && e.status !== "cancelada");
  const ativas = proximas.length;

  const pagos = (pax ?? []).filter((p) => p.status !== "cancelada");
  const receita = pagos.reduce((s, p) => s + Number(p.amount_paid || 0), 0);
  const pendente = pagos.reduce(
    (s, p) => s + Math.max(0, Number(p.total_price || 0) - Number(p.amount_paid || 0)),
    0,
  );
  const custos = (excursoes ?? []).reduce((s, e) => s + Number(e.custo_onibus || 0), 0);
  const lucro = receita - custos;
  const passageiros = pagos.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Painel do organizador</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral da sua operação.</p>
        </div>
        <Link
          to="/app/excursao/nova"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground glow-primary hover:opacity-90 transition"
        >
          <Plus className="h-4 w-4" /> Nova excursão
        </Link>
      </div>

      {/* Hero financeiro */}
      <div className="glass rounded-3xl p-5 mb-4 relative overflow-hidden hover:border-primary/50 transition">
        <div className="absolute -top-10 -right-10 size-40 rounded-full bg-neon-pink/30 blur-3xl pointer-events-none" />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Receita total</p>
            <p className="font-display text-4xl font-black text-gradient mt-1">{brl(receita)}</p>
            <div className="flex items-center gap-1 mt-2 text-neon-green text-xs font-medium">
              <TrendingUp className="size-3.5" /> {passageiros} passageiros confirmados
            </div>
          </div>
          <Link
            to="/app/relatorios"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
          >
            Relatórios <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          <MiniLink to="/app/pendentes" label="Pendente" value={brl(pendente)} tone="text-yellow-300" icon={AlertCircle} />
          <MiniLink to="/app/custos" label="Custos" value={brl(custos)} tone="text-neon-pink" icon={Wallet} />
          <MiniLink to="/app/relatorios" label="Lucro" value={brl(lucro)} tone={lucro >= 0 ? "text-neon-green" : "text-red-400"} icon={TrendingUp} />
        </div>
      </div>

      {/* Cards operacionais */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatLink to="/app/historico" label="Excursões" value={total} icon={Bus} />
        <StatLink to="/app/historico" label="Próximas" value={ativas} tone="green" />
        <StatLink to="/app/passageiros" label="Passageiros" value={passageiros} tone="pink" />
      </div>

      {/* Próximas excursões */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl font-bold">Próximas excursões</h2>
        <Link to="/app/historico" className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          Ver histórico <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !proximas.length ? (
        <EmptyState />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {proximas.map((e) => <ExcursaoCard key={e.id} ex={e} />)}
        </div>
      )}

      <Link
        to="/app/excursao/nova"
        className="sm:hidden fixed bottom-6 right-4 z-30 inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground glow-primary"
        aria-label="Nova excursão"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}

function StatLink({ to, label, value, tone, icon: Icon }: { to: string; label: string; value: React.ReactNode; tone?: "green" | "pink"; icon?: typeof Bus }) {
  const color = tone === "green" ? "text-neon-green" : tone === "pink" ? "text-neon-pink" : "text-foreground";
  return (
    <Link to={to as "/app/historico"} className="glass rounded-2xl p-4 hover:border-primary/50 transition block">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <p className={`font-display text-xl sm:text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </Link>
  );
}

function MiniLink({ to, label, value, tone, icon: Icon }: { to: string; label: string; value: string; tone: string; icon: typeof Wallet }) {
  return (
    <Link
      to={to as "/app/pendentes"}
      onClick={(e) => e.stopPropagation()}
      className="rounded-2xl bg-background/40 border border-border/60 p-3 hover:border-primary/50 transition block"
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className={`font-display font-bold text-sm sm:text-base mt-0.5 ${tone}`}>{value}</p>
    </Link>
  );
}


function ExcursaoCard({ ex }: { ex: Excursao }) {
  const statusColor: Record<string, string> = {
    rascunho: "bg-muted text-muted-foreground",
    publicada: "bg-neon-green/20 text-neon-green border-neon-green/30",
    ativa: "bg-neon-green/20 text-neon-green border-neon-green/30",
    encerrada: "bg-neon-purple/20 text-neon-purple border-neon-purple/30",
    cancelada: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <Link
      to="/app/excursao/$id"
      params={{ id: ex.id }}
      className="group glass rounded-2xl overflow-hidden hover:border-primary/50 transition"
    >
      <div
        className="h-24 relative"
        style={
          ex.banner_url
            ? { backgroundImage: `url(${ex.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: `linear-gradient(135deg, ${ex.cor ?? "#a855f7"}, #ec4899)` }
        }
      >
        {!ex.banner_url && <div className="absolute inset-0 grid-bg opacity-40" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display font-bold leading-tight">{ex.titulo}</h3>
          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${statusColor[ex.status] ?? statusColor.rascunho}`}>
            {ex.status}
          </span>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {ex.destino}</div>
          <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {fmtDateBR(ex.data_evento)}</div>
          <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {ex.total_vagas} vagas · R$ {Number(ex.preco).toFixed(2)}</div>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="glass rounded-3xl p-10 text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 mb-4">
        <Sparkles className="h-6 w-6 text-neon-pink" />
      </div>
      <h3 className="font-display text-xl font-bold">Nenhuma excursão futura</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
        Crie sua próxima viagem ou consulte o histórico para ver as anteriores.
      </p>
      <Link
        to="/app/excursao/nova"
        className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground glow-primary hover:opacity-90 transition"
      >
        <Plus className="h-4 w-4" /> Criar excursão
      </Link>
    </div>
  );
}
