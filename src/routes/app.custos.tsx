import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMemo } from "react";
import { Loader2, Wallet, Bus } from "lucide-react";

export const Route = createFileRoute("/app/custos")({
  head: () => ({ meta: [{ title: "Custos — SoltaTrip" }, { name: "robots", content: "noindex" }] }),
  component: Custos,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function Custos() {
  const { user } = useAuth();
  const { data: excursoes, isLoading } = useQuery({
    queryKey: ["custos-ex", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("excursoes")
        .select("id,titulo,destino,data_evento,custo_onibus,status")
        .eq("organizer_id", user!.id)
        .order("data_evento", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const ids = (excursoes ?? []).map((e: any) => e.id);
  const { data: onibusCount } = useQuery({
    queryKey: ["custos-onibus", user?.id, ids.length],
    enabled: !!user && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("onibus").select("excursao_id").in("excursao_id", ids);
      if (error) throw error;
      const m: Record<string, number> = {};
      (data ?? []).forEach((o: any) => { m[o.excursao_id] = (m[o.excursao_id] ?? 0) + 1; });
      return m;
    },
  });

  const total = useMemo(() => (excursoes ?? []).reduce((s: number, e: any) => s + Number(e.custo_onibus || 0), 0), [excursoes]);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-3xl font-bold">Custos operacionais</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Custo total: <span className="text-neon-pink font-bold">{brl(total)}</span></p>
      </div>

      {!excursoes?.length ? (
        <div className="glass rounded-3xl p-10 text-center">
          <Wallet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma excursão cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(excursoes as any[]).map((e) => (
            <Link key={e.id} to="/app/excursao/$id" params={{ id: e.id }}
              className="block glass rounded-2xl p-4 hover:border-primary/50 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{e.titulo}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {e.destino} · {new Date(e.data_evento + "T00:00:00").toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                    <Bus className="h-3 w-3" /> {onibusCount?.[e.id] ?? 0} ônibus
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase text-muted-foreground">Custo ônibus</p>
                  <p className="font-display font-bold text-neon-pink">{brl(Number(e.custo_onibus || 0))}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground mt-4 text-center">
        Custos adicionais (combustível, pedágio, staff, hospedagem) podem ser cadastrados em cada excursão.
      </p>
    </div>
  );
}
