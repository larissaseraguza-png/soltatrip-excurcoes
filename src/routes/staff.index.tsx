import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { StaffShell, Pill } from "@/components/staff/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useStaffExcursao, useStaffExcursoes } from "@/hooks/use-staff-excursao";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import {
  Activity, Loader2, Calendar, MapPin, CheckCircle2, XCircle, Mail,
  Bus, Users, QrCode, ArrowRight, CheckCircle, Wallet,
} from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/staff/")({
  component: StaffDashboard,
});

type ConviteVinculo = {
  id: string;
  status: string;
  papel: string;
  staff_user_id: string | null;
  convite_email: string | null;
  excursao: {
    id: string;
    titulo: string;
    destino: string;
    data_evento: string;
    cor: string | null;
  } | null;
};

function StaffDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { excursao: selecionada, setSelectedExcursao } = useStaffExcursao();
  const { data: ativos = [], isLoading } = useStaffExcursoes();
  const navigate = useNavigate();

  const { data: pendentes = [] } = useQuery({
    queryKey: ["staff-vinculos-pendentes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipe_excursoes")
        .select("id, status, papel, staff_user_id, convite_email, excursao:excursoes(id,titulo,destino,data_evento,cor)")
        .eq("staff_user_id", user!.id)
        .eq("status", "pendente")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ConviteVinculo[];
    },
  });

  async function responder(id: string, aceitar: boolean) {
    const update = aceitar
      ? { status: "ativo", staff_user_id: user!.id, convite_email: null }
      : { status: "recusado" };
    await supabase.from("equipe_excursoes").update(update).eq("id", id);
    qc.invalidateQueries({ queryKey: ["staff-vinculos-pendentes"] });
    qc.invalidateQueries({ queryKey: ["staff-vinculos-ativos"] });
  }

  function selecionar(excursaoId: string) {
    setSelectedExcursao(excursaoId);
    navigate({ to: "/staff/checkin" });
  }

  return (
    <StaffShell title="Central Staff" subtitle="Suas festas vinculadas">
      <section className="grid grid-cols-2 gap-3 mb-6">
        <Stat label="Festas ativas" value={ativos.length} icon={Activity} tone="from-neon-green to-neon-purple" />
        <Stat label="Convites pendentes" value={pendentes.length} icon={Mail} tone="from-neon-pink to-neon-purple" />
      </section>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {pendentes.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Convites pendentes</h2>
              <ul className="space-y-2">
                {pendentes.map((v) => (
                  <li key={v.id} className="glass rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-gradient-to-br from-neon-pink to-neon-purple grid place-items-center">
                        <Mail className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{v.excursao?.titulo ?? "Festa"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Convite como <span className="capitalize">{v.papel}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => responder(v.id, true)}
                        className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground font-bold text-sm glow-primary inline-flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Aceitar
                      </button>
                      <button
                        onClick={() => responder(v.id, false)}
                        className="flex-1 h-9 rounded-xl border border-red-500/30 text-red-400 font-bold text-sm inline-flex items-center justify-center gap-1.5 hover:bg-red-500/10"
                      >
                        <XCircle className="h-4 w-4" /> Recusar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              Minhas festas ({ativos.length})
            </h2>
            {ativos.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Você ainda não está vinculado a nenhuma festa.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Aguarde um convite do organizador (excursionista).
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {ativos.map((v) =>
                  v.excursao ? (
                    <FestaCard
                      key={v.id}
                      vinculo={v as any}
                      ativa={selecionada?.id === v.excursao.id}
                      onSelect={() => selecionar(v.excursao!.id)}
                    />
                  ) : null,
                )}
              </ul>
            )}
          </section>
        </>
      )}
    </StaffShell>
  );
}

function FestaCard({
  vinculo,
  ativa,
  onSelect,
}: {
  vinculo: { id: string; papel: string; onibus_id: string | null; excursao: { id: string; titulo: string; destino: string; data_evento: string; cor: string | null } };
  ativa: boolean;
  onSelect: () => void;
}) {
  const e = vinculo.excursao;

  const { data: stats } = useQuery({
    queryKey: ["staff-festa-stats", e.id, vinculo.onibus_id ?? "all"],
    staleTime: 30_000,
    queryFn: async () => {
      let paxQ = supabase
        .from("passageiros")
        .select("id,embarcado_em,payment_status,onibus_id")
        .eq("excursao_id", e.id);
      if (vinculo.onibus_id) paxQ = paxQ.eq("onibus_id", vinculo.onibus_id);
      const { data: pax } = await paxQ;
      const list = pax ?? [];
      return {
        total: list.length,
        embarcados: list.filter((p: any) => !!p.embarcado_em).length,
        pagos: list.filter((p: any) => p.payment_status === "paid").length,
      };
    },
  });

  useRealtimeSync(
    `staff-festa-card-${e.id}-${vinculo.onibus_id ?? "all"}`,
    [{ table: "passageiros", filter: `excursao_id=eq.${e.id}` }],
    [["staff-festa-stats", e.id, vinculo.onibus_id ?? "all"]],
  );

  return (
    <li
      className={`glass rounded-2xl overflow-hidden transition border ${ativa ? "border-neon-green/60 ring-1 ring-neon-green/40" : "border-transparent hover:border-neon-purple/40"}`}
    >
      <button onClick={onSelect} className="block w-full text-left">
        <div className="h-20 relative" style={{ background: `linear-gradient(135deg, ${e.cor ?? "#a855f7"}, #22d3a4)` }}>
          <div className="absolute inset-0 grid-bg opacity-40" />
          <div className="absolute top-2 right-2 flex gap-1.5">
            {ativa && (
              <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-neon-green text-background flex items-center gap-1">
                <CheckCircle className="size-3" /> Selecionada
              </span>
            )}
            <Pill tone="green">{vinculo.papel}</Pill>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-display font-bold leading-tight">{e.titulo}</h3>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {e.destino}</span>
            <span className="flex items-center gap-1"><Calendar className="size-3.5" /> {new Date(e.data_evento).toLocaleDateString("pt-BR")}</span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <MiniStat icon={Users} value={stats?.total ?? 0} label="Pax" />
            <MiniStat icon={QrCode} value={stats?.embarcados ?? 0} label="Embarq." />
            <MiniStat icon={Wallet} value={stats?.pagos ?? 0} label="Pagos" />
          </div>
        </div>
      </button>

      {ativa && (
        <div className="grid grid-cols-3 gap-px bg-border/60">
          <QuickAction to="/staff/checkin" icon={QrCode} label="Check-in" />
          <QuickAction to="/staff/onibus" icon={Bus} label="Ônibus" />
          <QuickAction to="/staff/passageiros" icon={Users} label="Pax" />
        </div>
      )}
    </li>
  );
}

function MiniStat({ icon: Icon, value, label }: { icon: any; value: number; label: string }) {
  return (
    <div className="rounded-xl bg-background/50 px-2 py-1.5 flex items-center gap-1.5">
      <Icon className="size-3.5 text-neon-green" />
      <div>
        <div className="text-sm font-display font-black leading-none">{value}</div>
        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link
      to={to}
      className="bg-background/60 hover:bg-neon-green/10 py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold text-neon-green"
    >
      <Icon className="size-3.5" /> {label} <ArrowRight className="size-3" />
    </Link>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className={`size-9 rounded-xl bg-gradient-to-br ${tone} grid place-items-center mb-3 glow-primary`}>
        <Icon className="size-4 text-primary-foreground" />
      </div>
      <div className="text-2xl font-display font-black">{value}</div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}
