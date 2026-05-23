import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { Plus, Calendar, MapPin, Users, Loader2, Sparkles } from "lucide-react";

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
  cor: string | null;
  banner_url: string | null;
};

function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["excursoes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("excursoes")
        .select("id,titulo,destino,data_evento,status,preco,total_vagas,cor,banner_url")
        .eq("organizer_id", user!.id)
        .order("data_evento", { ascending: true });
      if (error) throw error;
      return data as Excursao[];
    },
  });

  useRealtimeSync(
    `excursoes-org-${user?.id ?? "anon"}`,
    user ? [{ table: "excursoes", filter: `organizer_id=eq.${user.id}` }] : [],
    [["excursoes", user?.id]],
  );

  const total = data?.length ?? 0;
  const ativas = data?.filter((e) => e.status !== "cancelada").length ?? 0;
  const arrecadacaoEstimada = data?.reduce((s, e) => s + Number(e.preco) * e.total_vagas, 0) ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Minhas excursões</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie suas viagens.</p>
        </div>
        <Link
          to="/app/excursao/nova"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground glow-primary hover:opacity-90 transition"
        >
          <Plus className="h-4 w-4" /> Nova excursão
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Total" value={total} />
        <Stat label="Ativas" value={ativas} tone="green" />
        <Stat
          label="Potencial"
          value={`R$ ${arrecadacaoEstimada.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
          tone="pink"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !data?.length ? (
        <EmptyState />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {data.map((e) => <ExcursaoCard key={e.id} ex={e} />)}
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

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "green" | "pink" }) {
  const color = tone === "green" ? "text-neon-green" : tone === "pink" ? "text-neon-pink" : "text-foreground";
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
      <p className={`font-display text-xl sm:text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
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
        className="h-20 relative"
        style={{ background: `linear-gradient(135deg, ${ex.cor ?? "#a855f7"}, #ec4899)` }}
      >
        <div className="absolute inset-0 grid-bg opacity-40" />
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
          <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {new Date(ex.data_evento).toLocaleDateString("pt-BR")}</div>
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
      <h3 className="font-display text-xl font-bold">Nenhuma excursão ainda</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
        Comece criando sua primeira viagem. Leva menos de um minuto.
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
