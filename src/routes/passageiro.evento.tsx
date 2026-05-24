import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { Shell } from "@/components/passageiro/Shell";
import {
  Loader2, Sparkles, Ticket, Tent, HeartHandshake, Crown, KeyRound, Package,
  ChevronRight, Calendar, MapPin,
} from "lucide-react";

export const Route = createFileRoute("/passageiro/evento")({
  component: EventosHub,
});

const TIPO_ICON: Record<string, any> = {
  ingresso: Ticket, camping: Tent, solidario: HeartHandshake,
  vip: Crown, backstage: KeyRound, combo: Package, outro: Package,
};

function brl(v: number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function EventosHub() {
  const { user } = useAuth();

  const { data: reservas = [], isLoading } = useQuery({
    queryKey: ["evento-hub", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("reservas")
        .select("id, excursao:excursoes(id, titulo, destino, data_evento, banner_url, cor)")
        .eq("comprador_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []).filter((r: any) => r.excursao);
    },
  });

  const excursaoIds = reservas.map((r: any) => r.excursao.id);

  const { data: itens = [] } = useQuery({
    queryKey: ["evento-hub-itens", excursaoIds.join(",")],
    enabled: excursaoIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("excursao_itens")
        .select("*")
        .in("excursao_id", excursaoIds)
        .eq("ativo", true)
        .neq("status", "oculto")
        .order("ordem", { ascending: true });
      return data ?? [];
    },
  });

  useRealtimeSync(
    "evento-hub",
    [{ table: "excursao_itens" }, { table: "reservas" }],
    [["evento-hub", user?.id], ["evento-hub-itens", excursaoIds.join(",")]],
  );

  const itensPorEx = new Map<string, any[]>();
  for (const it of itens as any[]) {
    const arr = itensPorEx.get(it.excursao_id) ?? [];
    arr.push(it);
    itensPorEx.set(it.excursao_id, arr);
  }

  return (
    <Shell title="Evento" subtitle="Ingressos, camping, VIP e combos">
      <div className="glass rounded-2xl p-4 mb-5 flex items-start gap-3 border border-neon-pink/20">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink grid place-items-center shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="text-xs text-muted-foreground">
          Aqui ficam os itens vendidos pelo organizador de cada evento. A emissão oficial é feita por
          ele após a confirmação do pagamento.
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : reservas.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Você ainda não tem reservas. Reserve uma excursão para ver os itens disponíveis.
        </div>
      ) : (
        <ul className="space-y-4">
          {reservas.map((r: any) => {
            const ex = r.excursao;
            const its = itensPorEx.get(ex.id) ?? [];
            return (
              <li key={r.id} className="glass rounded-3xl overflow-hidden border border-border/60">
                <Link
                  to="/passageiro/itens/$id"
                  params={{ id: ex.id }}
                  className="block relative h-32"
                  style={{
                    background: ex.banner_url
                      ? `url(${ex.banner_url}) center/cover`
                      : `linear-gradient(135deg, ${ex.cor ?? "#a855f7"}, #ec4899)`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display font-black text-lg leading-tight truncate">{ex.titulo}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {ex.data_evento ? new Date(ex.data_evento).toLocaleDateString("pt-BR") : "—"}
                        <MapPin className="h-3 w-3 ml-1" />
                        <span className="truncate">{ex.destino}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0" />
                  </div>
                </Link>

                <div className="p-3">
                  {its.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Nenhum item disponível ainda.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {its.slice(0, 4).map((it: any) => {
                        const Icon = TIPO_ICON[it.tipo] ?? Package;
                        const restante =
                          it.quantidade_total != null
                            ? Math.max(0, it.quantidade_total - it.quantidade_vendida)
                            : null;
                        const esgotado = it.status === "esgotado" || (restante != null && restante <= 0);
                        return (
                          <Link
                            key={it.id}
                            to="/passageiro/itens/$id"
                            params={{ id: ex.id }}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-secondary/30 transition ${
                              esgotado ? "opacity-50" : ""
                            }`}
                          >
                            <div className="h-7 w-7 rounded-lg bg-secondary/40 grid place-items-center shrink-0">
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <span className="flex-1 text-sm truncate">{it.nome}</span>
                            {esgotado ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold">
                                ESGOTADO
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-neon-green">{brl(it.valor)}</span>
                            )}
                          </Link>
                        );
                      })}
                      {its.length > 4 && (
                        <Link
                          to="/passageiro/itens/$id"
                          params={{ id: ex.id }}
                          className="block text-center text-xs text-neon-pink font-bold pt-1"
                        >
                          Ver todos os {its.length} itens →
                        </Link>
                      )}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}
