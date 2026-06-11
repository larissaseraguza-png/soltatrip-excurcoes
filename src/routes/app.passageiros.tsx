import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMemo, useState } from "react";
import { Loader2, Search, Users, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/app/passageiros")({
  head: () => ({ meta: [{ title: "Passageiros — SoltaTrip" }, { name: "robots", content: "noindex" }] }),
  component: PassageirosReport,
});

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

type Ex = { id: string; titulo: string };
type Onibus = { id: string; nome: string };
type Pax = {
  id: string; nome: string; assento: string | null; status: string;
  total_price: number; amount_paid: number; payment_status: string;
  excursao_id: string; onibus_id: string | null; embarcado_em: string | null;
};

function PassageirosReport() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"todos" | "pagos" | "pendentes" | "checkin">("todos");

  const { data: excursoes } = useQuery({
    queryKey: ["org-ex-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("excursoes").select("id,titulo").eq("organizer_id", user!.id);
      if (error) throw error;
      return (data ?? []) as Ex[];
    },
  });
  const ids = excursoes?.map((e) => e.id) ?? [];

  const { data: pax, isLoading } = useQuery({
    queryKey: ["org-pax-all", user?.id, ids.length],
    enabled: !!user && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passageiros")
        .select("id,nome,assento,status,total_price,amount_paid,payment_status,excursao_id,onibus_id,embarcado_em")
        .in("excursao_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Pax[];
    },
  });

  const { data: onibus } = useQuery({
    queryKey: ["org-onibus-all", user?.id, ids.length],
    enabled: !!user && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("onibus").select("id,nome").in("excursao_id", ids);
      if (error) throw error;
      return (data ?? []) as Onibus[];
    },
  });

  const exMap = useMemo(() => Object.fromEntries((excursoes ?? []).map((e) => [e.id, e.titulo])), [excursoes]);
  const onMap = useMemo(() => Object.fromEntries((onibus ?? []).map((o) => [o.id, o.nome])), [onibus]);

  const filtered = useMemo(() => {
    let list = pax ?? [];
    if (filter === "pagos") list = list.filter((p) => p.amount_paid >= p.total_price && p.total_price > 0);
    if (filter === "pendentes") list = list.filter((p) => p.amount_paid < p.total_price);
    if (filter === "checkin") list = list.filter((p) => !!p.embarcado_em);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((p) => p.nome.toLowerCase().includes(s) || (p.assento ?? "").toLowerCase().includes(s));
    }
    return list;
  }, [pax, filter, q]);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-3xl font-bold">Passageiros</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} de {pax?.length ?? 0} passageiros</p>
      </div>

      <div className="glass rounded-2xl flex items-center gap-3 px-4 py-3 mb-4">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar nome ou poltrona…"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {([["todos","Todos"],["pagos","Pagos"],["pendentes","Pendentes"],["checkin","Check-in"]] as const).map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              filter === k ? "bg-primary text-primary-foreground glow-primary" : "glass text-muted-foreground"
            }`}>{l}</button>
        ))}
      </div>

      {!filtered.length ? (
        <div className="glass rounded-3xl p-10 text-center">
          <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum passageiro encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground mb-1">
            Cada linha é um vínculo independente: valores nunca são somados entre excursões diferentes.
          </p>
          {filtered.map((p) => {
            const total = Number(p.total_price) || 0;
            const paid = Number(p.amount_paid) || 0;
            const restante = Math.max(0, total - paid);
            const pago = paid >= total && total > 0;
            const parcial = paid > 0 && paid < total;
            const statusLabel = pago ? "Quitado" : parcial ? "Parcial" : "Pendente";
            return (
              <Link key={p.id} to="/app/excursao/$id" params={{ id: p.excursao_id }}
                className="block glass rounded-2xl p-4 hover:border-primary/50 transition">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{p.nome}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{exMap[p.excursao_id] ?? "—"}</p>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                    pago ? "bg-neon-green/20 text-neon-green border-neon-green/30"
                    : parcial ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                  }`}>{statusLabel}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] mb-2">
                  <Cell label="Total" value={brl(total)} />
                  <Cell label="Pago" value={brl(paid)} tone="text-neon-green" />
                  <Cell label="Pendente" value={brl(restante)} tone={restante > 0 ? "text-yellow-300" : "text-muted-foreground"} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <Cell label="Ônibus" value={p.onibus_id ? (onMap[p.onibus_id] ?? "—") : "—"} />
                  <Cell label="Poltrona" value={p.assento ?? "—"} />
                  <Cell
                    label="Check-in"
                    value={p.embarcado_em ? "Sim" : "Não"}
                    tone={p.embarcado_em ? "text-neon-green" : "text-muted-foreground"}
                    icon={p.embarcado_em ? CheckCircle2 : Clock}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value, tone, icon: Icon }: { label: string; value: string; tone?: string; icon?: typeof CheckCircle2 }) {
  return (
    <div className="rounded-lg bg-background/40 border border-border/60 px-2 py-1.5">
      <div className="text-[9px] uppercase text-muted-foreground tracking-wider flex items-center gap-1">
        {Icon && <Icon className="h-2.5 w-2.5" />} {label}
      </div>
      <p className={`font-display font-bold text-xs mt-0.5 truncate ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
