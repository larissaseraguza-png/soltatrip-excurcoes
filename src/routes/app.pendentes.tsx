import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMemo } from "react";
import { Loader2, AlertCircle, Phone } from "lucide-react";

export const Route = createFileRoute("/app/pendentes")({
  head: () => ({ meta: [{ title: "Pagamentos pendentes — SoltaTrip" }, { name: "robots", content: "noindex" }] }),
  component: Pendentes,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function Pendentes() {
  const { user } = useAuth();
  const { data: excursoes } = useQuery({
    queryKey: ["pend-ex", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("excursoes").select("id,titulo").eq("organizer_id", user!.id);
      if (error) throw error;
      return (data ?? []) as { id: string; titulo: string }[];
    },
  });
  const ids = excursoes?.map((e) => e.id) ?? [];

  const { data: pax, isLoading } = useQuery({
    queryKey: ["pend-pax", user?.id, ids.length],
    enabled: !!user && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passageiros")
        .select("id,nome,telefone,total_price,amount_paid,excursao_id,status")
        .in("excursao_id", ids);
      if (error) throw error;
      return (data ?? []).filter((p: any) => p.status !== "cancelada" && Number(p.amount_paid || 0) < Number(p.total_price || 0));
    },
  });

  const { data: pagsByPax } = useQuery({
    queryKey: ["pend-pags", user?.id, ids.length],
    enabled: !!user && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos").select("passageiro_id,valor,metodo,status").in("excursao_id", ids);
      if (error) throw error;
      const map: Record<string, { count: number; metodos: Set<string> }> = {};
      (data ?? []).forEach((p: any) => {
        if (!p.passageiro_id) return;
        map[p.passageiro_id] ??= { count: 0, metodos: new Set() };
        if (p.status === "pago") { map[p.passageiro_id].count += 1; map[p.passageiro_id].metodos.add(p.metodo); }
      });
      return map;
    },
  });

  const exMap = useMemo(() => Object.fromEntries((excursoes ?? []).map((e) => [e.id, e.titulo])), [excursoes]);
  const totalPend = (pax ?? []).reduce((s, p: any) => s + (Number(p.total_price) - Number(p.amount_paid)), 0);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-3xl font-bold">Pagamentos pendentes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{pax?.length ?? 0} passageiros · {brl(totalPend)} em aberto</p>
      </div>

      {!pax?.length ? (
        <div className="glass rounded-3xl p-10 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum pagamento pendente.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pax.map((p: any) => {
            const rest = Number(p.total_price) - Number(p.amount_paid);
            const info = pagsByPax?.[p.id];
            return (
              <Link key={p.id} to="/app/excursao/$id" params={{ id: p.excursao_id }}
                className="block glass rounded-2xl p-4 hover:border-primary/50 transition">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{p.nome}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{exMap[p.excursao_id] ?? "—"}</p>
                    {p.telefone && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" /> {p.telefone}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase text-muted-foreground">Restante</p>
                    <p className="font-display font-bold text-yellow-300">{brl(rest)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <Cell label="Pago" value={brl(Number(p.amount_paid))} tone="text-neon-green" />
                  <Cell label="Total" value={brl(Number(p.total_price))} />
                  <Cell label="Parcelas" value={info ? `${info.count} (${[...info.metodos].join(", ") || "—"})` : "0"} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-background/40 border border-border/60 px-2 py-1.5">
      <div className="text-[9px] uppercase text-muted-foreground tracking-wider">{label}</div>
      <p className={`font-display font-bold text-xs mt-0.5 truncate ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
