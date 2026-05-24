import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMemo, useState } from "react";
import { Loader2, ChevronDown, ChevronRight, MapPin, Users, Bus, TrendingUp, History as HistoryIcon } from "lucide-react";

export const Route = createFileRoute("/app/historico")({
  head: () => ({ meta: [{ title: "Histórico de excursões — SoltaTrip" }, { name: "robots", content: "noindex" }] }),
  component: Historico,
});

type Excursao = {
  id: string; titulo: string; destino: string; data_evento: string; status: string;
  preco: number; total_vagas: number; custo_onibus: number; banner_url: string | null;
};
type PaxAgg = Record<string, { confirmados: number; receita: number; total_price: number }>;
type OnibusAgg = Record<string, number>;

const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function Historico() {
  const { user } = useAuth();

  const { data: excursoes, isLoading } = useQuery({
    queryKey: ["historico-excursoes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("excursoes")
        .select("id,titulo,destino,data_evento,status,preco,total_vagas,custo_onibus,banner_url")
        .eq("organizer_id", user!.id)
        .order("data_evento", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Excursao[];
    },
  });

  const ids = excursoes?.map((e) => e.id) ?? [];

  const { data: paxAgg } = useQuery({
    queryKey: ["historico-pax", user?.id, ids.length],
    enabled: !!user && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passageiros")
        .select("excursao_id,total_price,amount_paid,status")
        .in("excursao_id", ids);
      if (error) throw error;
      const agg: PaxAgg = {};
      (data ?? []).forEach((p: any) => {
        const k = p.excursao_id as string;
        agg[k] ??= { confirmados: 0, receita: 0, total_price: 0 };
        if (p.status !== "cancelada") {
          agg[k].confirmados += 1;
          agg[k].receita += Number(p.amount_paid || 0);
          agg[k].total_price += Number(p.total_price || 0);
        }
      });
      return agg;
    },
  });

  const { data: onibusAgg } = useQuery({
    queryKey: ["historico-onibus", user?.id, ids.length],
    enabled: !!user && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onibus")
        .select("excursao_id")
        .in("excursao_id", ids);
      if (error) throw error;
      const agg: OnibusAgg = {};
      (data ?? []).forEach((o: any) => {
        agg[o.excursao_id] = (agg[o.excursao_id] ?? 0) + 1;
      });
      return agg;
    },
  });

  const grouped = useMemo(() => {
    const out: Record<number, Record<number, Excursao[]>> = {};
    (excursoes ?? []).forEach((e) => {
      const d = new Date(e.data_evento + "T00:00:00");
      const y = d.getFullYear();
      const m = d.getMonth();
      out[y] ??= {};
      out[y][m] ??= [];
      out[y][m].push(e);
    });
    return out;
  }, [excursoes]);

  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a);
  const [openYears, setOpenYears] = useState<Record<number, boolean>>({});
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!excursoes?.length) {
    return (
      <div className="glass rounded-3xl p-10 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 mb-4">
          <HistoryIcon className="h-6 w-6 text-neon-pink" />
        </div>
        <h3 className="font-display text-xl font-bold">Sem histórico ainda</h3>
        <p className="text-sm text-muted-foreground mt-1">Suas excursões aparecerão aqui automaticamente.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Histórico de excursões</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Organizado por ano e mês.</p>
      </div>

      <div className="space-y-4">
        {years.map((y) => {
          const yOpen = openYears[y] ?? (y === years[0]);
          const months = Object.keys(grouped[y]).map(Number).sort((a, b) => b - a);
          const totalAno = months.reduce((s, m) => s + grouped[y][m].length, 0);
          return (
            <div key={y} className="glass rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenYears((p) => ({ ...p, [y]: !yOpen }))}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition"
              >
                <div className="flex items-center gap-3">
                  {yOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-display text-2xl font-bold">{y}</span>
                </div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                  {totalAno} {totalAno === 1 ? "excursão" : "excursões"}
                </span>
              </button>
              {yOpen && (
                <div className="px-3 pb-3 space-y-2">
                  {months.map((m) => {
                    const key = `${y}-${m}`;
                    const mOpen = openMonths[key] ?? false;
                    const list = grouped[y][m];
                    const recMes = list.reduce((s, e) => s + (paxAgg?.[e.id]?.receita ?? 0), 0);
                    return (
                      <div key={key} className="rounded-xl bg-background/40 border border-border/60">
                        <button
                          onClick={() => setOpenMonths((p) => ({ ...p, [key]: !mOpen }))}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition"
                        >
                          <div className="flex items-center gap-2">
                            {mOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            <span className="font-semibold">{meses[m]}</span>
                            <span className="text-xs text-muted-foreground">· {list.length} {list.length === 1 ? "excursão" : "excursões"}</span>
                          </div>
                          <span className="text-xs font-bold text-neon-green">{brl(recMes)}</span>
                        </button>
                        {mOpen && (
                          <div className="px-3 pb-3 space-y-2">
                            {list.map((e) => {
                              const ag = paxAgg?.[e.id] ?? { confirmados: 0, receita: 0, total_price: 0 };
                              const onibus = onibusAgg?.[e.id] ?? 0;
                              const lucro = ag.receita - Number(e.custo_onibus || 0);
                              return (
                                <Link
                                  key={e.id}
                                  to="/app/excursao/$id"
                                  params={{ id: e.id }}
                                  className="block rounded-xl bg-card border border-border/60 hover:border-primary/50 transition p-3"
                                >
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="min-w-0">
                                      <p className="font-display font-bold truncate">{e.titulo}</p>
                                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <MapPin className="h-3 w-3" /> {e.destino} ·{" "}
                                        {new Date(e.data_evento + "T00:00:00").toLocaleDateString("pt-BR")}
                                      </p>
                                    </div>
                                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${
                                      e.status === "cancelada" ? "bg-red-500/20 text-red-400 border-red-500/30"
                                      : e.status === "encerrada" ? "bg-neon-purple/20 text-neon-purple border-neon-purple/30"
                                      : "bg-neon-green/20 text-neon-green border-neon-green/30"
                                    }`}>{e.status}</span>
                                  </div>
                                  <div className="grid grid-cols-4 gap-2 text-[11px]">
                                    <Cell icon={Users} label="Pax" value={String(ag.confirmados)} />
                                    <Cell icon={Bus} label="Ônibus" value={String(onibus)} />
                                    <Cell icon={TrendingUp} label="Receita" value={brl(ag.receita)} tone="text-neon-green" />
                                    <Cell icon={TrendingUp} label="Lucro" value={brl(lucro)} tone={lucro >= 0 ? "text-neon-green" : "text-red-400"} />
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Cell({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-background/40 border border-border/60 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[9px] uppercase text-muted-foreground tracking-wider">
        <Icon className="h-2.5 w-2.5" /> {label}
      </div>
      <p className={`font-display font-bold text-xs mt-0.5 ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
