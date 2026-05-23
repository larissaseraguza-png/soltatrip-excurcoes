import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { StaffShell, Pill } from "@/components/staff/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useStaffExcursao } from "@/hooks/use-staff-excursao";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { Wallet, Loader2, Lock } from "lucide-react";

export const Route = createFileRoute("/staff/financeiro")({
  component: FinanceiroStaff,
});

type Reserva = {
  id: string;
  total_price: number;
  amount_paid: number;
  payment_status: string;
  quantidade: number;
};
type Pagamento = {
  id: string;
  valor: number;
  metodo: string;
  status: string;
  created_at: string;
  passageiro_id: string | null;
};

function FinanceiroStaff() {
  const { excursao, loading } = useStaffExcursao();

  const { data: reservas = [] } = useQuery({
    queryKey: ["staff-fin-reservas", excursao?.id],
    enabled: !!excursao?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservas")
        .select("id,total_price,amount_paid,payment_status,quantidade")
        .eq("excursao_id", excursao!.id);
      if (error) throw error;
      return (data ?? []) as Reserva[];
    },
  });

  const { data: pagamentos = [] } = useQuery({
    queryKey: ["staff-fin-pagamentos", excursao?.id],
    enabled: !!excursao?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos")
        .select("id,valor,metodo,status,created_at,passageiro_id")
        .eq("excursao_id", excursao!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Pagamento[];
    },
  });

  const { data: passageiros = [] } = useQuery({
    queryKey: ["staff-fin-pax", excursao?.id],
    enabled: !!excursao?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passageiros")
        .select("id,nome,payment_status,total_price,amount_paid")
        .eq("excursao_id", excursao!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  useRealtimeSync(
    `staff-fin-${excursao?.id ?? "none"}`,
    excursao?.id
      ? [
          { table: "reservas", filter: `excursao_id=eq.${excursao.id}` },
          { table: "pagamentos", filter: `excursao_id=eq.${excursao.id}` },
          { table: "passageiros", filter: `excursao_id=eq.${excursao.id}` },
        ]
      : [],
    [
      ["staff-fin-reservas", excursao?.id],
      ["staff-fin-pagamentos", excursao?.id],
      ["staff-fin-pax", excursao?.id],
    ],
  );

  const totals = useMemo(() => {
    const total = reservas.reduce((s, r) => s + Number(r.total_price || 0), 0);
    const pago = reservas.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
    const pendente = Math.max(0, total - pago);
    const confirmadas = reservas.filter((r) => r.payment_status === "paid").length;
    const parciais = reservas.filter((r) => r.payment_status === "partial_payment").length;
    const pendentesRes = reservas.filter((r) => r.payment_status === "pending_payment").length;
    return { total, pago, pendente, confirmadas, parciais, pendentesRes };
  }, [reservas]);

  const paxById = useMemo(() => new Map((passageiros as any[]).map((p) => [p.id, p])), [passageiros]);
  const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <StaffShell title="Financeiro (visualização)" subtitle={excursao?.titulo ?? "Sem excursão vinculada"}>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !excursao ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Nenhuma excursão ativa vinculada.
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl p-3 mb-4 flex items-center gap-3 border border-yellow-400/30 bg-yellow-400/5">
            <Lock className="size-4 text-yellow-300 shrink-0" />
            <div className="text-[11px] text-yellow-200">
              Somente leitura. Apenas o organizador pode confirmar ou alterar pagamentos.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <Card label="Arrecadado" value={brl(totals.pago)} tone="green" />
            <Card label="Pendente" value={brl(totals.pendente)} tone="yellow" />
            <Card label="Total previsto" value={brl(totals.total)} tone="purple" />
            <Card label="Reservas pagas" value={String(totals.confirmadas)} tone="green" />
          </div>

          <section className="mb-5">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Status das reservas</h3>
            <div className="grid grid-cols-3 gap-2">
              <Mini label="Pagas" value={totals.confirmadas} tone="green" />
              <Mini label="Parciais" value={totals.parciais} tone="yellow" />
              <Mini label="Pendentes" value={totals.pendentesRes} tone="muted" />
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Pagamentos recentes</h3>
            {pagamentos.length === 0 ? (
              <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">Nenhum pagamento ainda.</div>
            ) : (
              <div className="glass rounded-2xl divide-y divide-border/60">
                {pagamentos.map((p) => {
                  const pax = p.passageiro_id ? paxById.get(p.passageiro_id) : null;
                  return (
                    <div key={p.id} className="p-3 flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-gradient-to-br from-neon-green/30 to-neon-purple/20 grid place-items-center">
                        <Wallet className="size-4 text-neon-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{pax?.nome ?? "—"}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {p.metodo.toUpperCase()} ·{" "}
                          {new Date(p.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                        </div>
                      </div>
                      <div className="text-sm font-bold">{brl(Number(p.valor))}</div>
                      <Pill tone={p.status === "confirmado" ? "green" : p.status === "pendente" ? "yellow" : "red"}>
                        {p.status}
                      </Pill>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </StaffShell>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone: "green" | "yellow" | "purple" }) {
  const color = tone === "green" ? "text-neon-green" : tone === "yellow" ? "text-yellow-300" : "text-neon-purple";
  return (
    <div className="glass rounded-2xl p-4">
      <div className={`text-lg font-display font-black ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: number; tone: "green" | "yellow" | "muted" }) {
  const color = tone === "green" ? "text-neon-green" : tone === "yellow" ? "text-yellow-300" : "text-muted-foreground";
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <div className={`text-xl font-display font-black ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
    </div>
  );
}
