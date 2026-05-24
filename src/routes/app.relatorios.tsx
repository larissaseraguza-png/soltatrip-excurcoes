import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMemo } from "react";
import { Loader2, TrendingUp, Users, Bus, Trophy, BarChart3, XCircle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — SoltaTrip" }, { name: "robots", content: "noindex" }] }),
  component: Relatorios,
});

type Excursao = {
  id: string; titulo: string; data_evento: string; status: string;
  total_vagas: number; custo_onibus: number;
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function Relatorios() {
  const { user } = useAuth();

  const { data: excursoes, isLoading } = useQuery({
    queryKey: ["rel-excursoes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("excursoes")
        .select("id,titulo,data_evento,status,total_vagas,custo_onibus")
        .eq("organizer_id", user!.id);
      if (error) throw error;
      return (data ?? []) as Excursao[];
    },
  });

  const ids = excursoes?.map((e) => e.id) ?? [];
  const { data: pax } = useQuery({
    queryKey: ["rel-pax", user?.id, ids.length],
    enabled: !!user && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passageiros")
        .select("excursao_id,total_price,amount_paid,status")
        .in("excursao_id", ids);
      if (error) throw error;
      return (data ?? []) as { excursao_id: string; total_price: number; amount_paid: number; status: string }[];
    },
  });

  const stats = useMemo(() => {
    const ex = excursoes ?? [];
    const px = pax ?? [];
    const realizadas = ex.filter((e) => e.status === "encerrada" || (e.status !== "cancelada" && e.data_evento < new Date().toISOString().slice(0, 10)));
    const canceladas = ex.filter((e) => e.status === "cancelada");
    const ativas = ex.filter((e) => e.status !== "cancelada");

    const byEx: Record<string, { confirmados: number; receita: number; vagas: number; titulo: string; custo: number }> = {};
    ex.forEach((e) => { byEx[e.id] = { confirmados: 0, receita: 0, vagas: e.total_vagas, titulo: e.titulo, custo: Number(e.custo_onibus || 0) }; });
    px.forEach((p) => {
      if (p.status === "cancelada") return;
      const k = byEx[p.excursao_id]; if (!k) return;
      k.confirmados += 1; k.receita += Number(p.amount_paid || 0);
    });

    const totalPax = Object.values(byEx).reduce((s, v) => s + v.confirmados, 0);
    const totalVagas = Object.values(byEx).reduce((s, v) => s + v.vagas, 0);
    const ocupacao = totalVagas > 0 ? (totalPax / totalVagas) * 100 : 0;
    const mediaPax = ativas.length > 0 ? totalPax / ativas.length : 0;

    const ranking = Object.entries(byEx)
      .map(([, v]) => ({ titulo: v.titulo, lucro: v.receita - v.custo, receita: v.receita }))
      .sort((a, b) => b.lucro - a.lucro);
    const topLucro = ranking[0];

    // Receita por mês (últimos 12)
    const byMonth: Record<string, number> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      byMonth[`${d.getFullYear()}-${d.getMonth()}`] = 0;
    }
    ex.forEach((e) => {
      const d = new Date(e.data_evento + "T00:00:00");
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (k in byMonth) byMonth[k] += byEx[e.id]?.receita ?? 0;
    });
    const monthly = Object.entries(byMonth).map(([k, v]) => {
      const [y, m] = k.split("-").map(Number);
      return { label: `${meses[m]}/${String(y).slice(2)}`, value: v };
    });
    const maxMonth = Math.max(1, ...monthly.map((m) => m.value));

    return { realizadas: realizadas.length, canceladas: canceladas.length, ativas: ativas.length,
      totalPax, ocupacao, mediaPax, topLucro, monthly, maxMonth };
  }, [excursoes, pax]);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Indicadores da sua operação.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Stat icon={CheckCircle2} label="Realizadas" value={stats.realizadas} tone="text-neon-green" />
        <Stat icon={XCircle} label="Canceladas" value={stats.canceladas} tone="text-red-400" />
        <Stat icon={Users} label="Passageiros" value={stats.totalPax} />
        <Stat icon={Bus} label="Ocupação" value={`${stats.ocupacao.toFixed(0)}%`} tone="text-neon-pink" />
      </div>

      <div className="glass rounded-3xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-neon-pink" />
          <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">Receita mensal (12 meses)</h3>
        </div>
        <div className="flex items-end gap-1.5 h-32">
          {stats.monthly.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-neon-purple to-neon-pink"
                style={{ height: `${Math.max(2, (m.value / stats.maxMonth) * 100)}%` }}
                title={brl(m.value)}
              />
              <span className="text-[9px] text-muted-foreground">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-neon-green" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Média de passageiros</p>
          </div>
          <p className="font-display text-3xl font-bold">{stats.mediaPax.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground mt-1">por excursão (ativas)</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-4 w-4 text-yellow-300" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Excursão mais lucrativa</p>
          </div>
          {stats.topLucro ? (
            <>
              <p className="font-display font-bold truncate">{stats.topLucro.titulo}</p>
              <p className="text-sm text-neon-green mt-1 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" /> {brl(stats.topLucro.lucro)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <p className={`font-display text-2xl font-bold mt-1 ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
