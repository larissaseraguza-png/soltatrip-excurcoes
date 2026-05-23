import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { StaffShell, Pill } from "@/components/staff/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useStaffExcursao } from "@/hooks/use-staff-excursao";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { CheckCircle2, XCircle, UserCheck, Loader2, Search } from "lucide-react";

export const Route = createFileRoute("/staff/checkin")({
  component: CheckinStaff,
});

type Passageiro = {
  id: string;
  nome: string;
  assento: string | null;
  seat_id: string | null;
  qr_code: string;
  embarcado_em: string | null;
  status: string;
  payment_status: string;
};

function CheckinStaff() {
  const { user } = useAuth();
  const { excursao, loading } = useStaffExcursao();
  const qc = useQueryClient();
  const [code, setCode] = useState("");

  const { data: passageiros = [] } = useQuery({
    queryKey: ["staff-checkin-pax", excursao?.id],
    enabled: !!excursao?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passageiros")
        .select("id,nome,assento,seat_id,qr_code,embarcado_em,status,payment_status")
        .eq("excursao_id", excursao!.id)
        .order("embarcado_em", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Passageiro[];
    },
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ["staff-checkins", excursao?.id],
    enabled: !!excursao?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkins")
        .select("id,passageiro_id,created_at")
        .eq("excursao_id", excursao!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  useRealtimeSync(
    `staff-checkin-${excursao?.id ?? "none"}`,
    excursao?.id
      ? [
          { table: "passageiros", filter: `excursao_id=eq.${excursao.id}` },
          { table: "checkins", filter: `excursao_id=eq.${excursao.id}` },
        ]
      : [],
    [
      ["staff-checkin-pax", excursao?.id],
      ["staff-checkins", excursao?.id],
    ],
  );

  const paxById = useMemo(() => new Map(passageiros.map((p) => [p.id, p])), [passageiros]);
  const embarcados = passageiros.filter((p) => !!p.embarcado_em);
  const aguardando = passageiros.filter((p) => !p.embarcado_em);

  async function realizarCheckin(passageiroId: string) {
    if (!excursao || !user) return;
    const pax = paxById.get(passageiroId);
    if (!pax) {
      toast.error("Passageiro não encontrado.");
      return;
    }
    if (pax.embarcado_em) {
      toast.message(`${pax.nome} já embarcou.`);
      return;
    }
    const now = new Date().toISOString();
    const { error: e1 } = await supabase
      .from("passageiros")
      .update({ embarcado_em: now })
      .eq("id", passageiroId);
    if (e1) {
      toast.error(e1.message);
      return;
    }
    const { error: e2 } = await supabase
      .from("checkins")
      .insert({ excursao_id: excursao.id, passageiro_id: passageiroId, feito_por: user.id });
    if (e2) toast.error(e2.message);
    else toast.success(`Check-in: ${pax.nome}`);
    qc.invalidateQueries({ queryKey: ["staff-checkin-pax", excursao.id] });
    qc.invalidateQueries({ queryKey: ["staff-checkins", excursao.id] });
  }

  async function buscarECheckin(e: React.FormEvent) {
    e.preventDefault();
    const q = code.trim();
    if (!q) return;
    const alvo = passageiros.find(
      (p) =>
        p.qr_code === q ||
        p.id === q ||
        (p.assento && p.assento.toLowerCase() === q.toLowerCase()) ||
        p.nome.toLowerCase().includes(q.toLowerCase()),
    );
    if (!alvo) {
      toast.error("Passageiro não encontrado.");
      return;
    }
    setCode("");
    await realizarCheckin(alvo.id);
  }

  return (
    <StaffShell title="Check-in Operacional" subtitle={excursao?.titulo ?? "Sem excursão vinculada"}>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !excursao ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Nenhuma excursão ativa vinculada.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-5">
            <Metric value={embarcados.length} label="Embarcados" tone="green" />
            <Metric value={aguardando.length} label="Aguardando" tone="yellow" />
            <Metric value={passageiros.length} label="Total" tone="purple" />
          </div>

          <form onSubmit={buscarECheckin} className="glass rounded-2xl p-3 mb-5 flex items-center gap-2">
            <Search className="size-4 text-muted-foreground ml-2" />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="QR / nome / poltrona…"
              className="flex-1 bg-transparent outline-none text-sm"
            />
            <button className="h-9 px-3 rounded-xl bg-gradient-to-br from-neon-green to-neon-purple glow-primary text-primary-foreground text-xs font-bold inline-flex items-center gap-1.5">
              <UserCheck className="size-4" /> Check-in
            </button>
          </form>

          <section className="mb-5">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Aguardando embarque</h3>
            {aguardando.length === 0 ? (
              <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">Todos embarcaram. 🎉</div>
            ) : (
              <div className="glass rounded-2xl divide-y divide-border/60">
                {aguardando.slice(0, 30).map((p) => (
                  <div key={p.id} className="p-3 flex items-center gap-3">
                    <XCircle className="size-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{p.nome}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Poltrona {p.assento ?? "—"} · {p.payment_status === "paid" ? "pago" : "pgto pendente"}
                      </div>
                    </div>
                    <button
                      onClick={() => realizarCheckin(p.id)}
                      className="h-8 px-3 rounded-lg glass text-[11px] font-bold inline-flex items-center gap-1"
                    >
                      <UserCheck className="size-3.5" /> Embarcar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Embarques recentes</h3>
            {checkins.length === 0 ? (
              <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">Nenhum check-in ainda.</div>
            ) : (
              <div className="glass rounded-2xl divide-y divide-border/60">
                {checkins.map((c: any) => {
                  const p = paxById.get(c.passageiro_id);
                  return (
                    <div key={c.id} className="p-3 flex items-center gap-3">
                      <CheckCircle2 className="size-5 text-neon-green" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{p?.nome ?? "Passageiro"}</div>
                        <div className="text-[10px] text-muted-foreground">Poltrona {p?.assento ?? "—"}</div>
                      </div>
                      <span className="text-[10px] text-neon-green">
                        {new Date(c.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
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

function Metric({ value, label, tone }: { value: number; label: string; tone: "green" | "yellow" | "purple" }) {
  const color = tone === "green" ? "text-neon-green" : tone === "yellow" ? "text-yellow-300" : "text-neon-purple";
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <div className={`text-2xl font-display font-black ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}
