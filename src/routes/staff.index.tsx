import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { StaffShell, Pill } from "@/components/staff/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Activity, Loader2, Calendar, MapPin, CheckCircle2, XCircle, Mail } from "lucide-react";

export const Route = createFileRoute("/staff/")({
  component: StaffDashboard,
});

type Vinculo = {
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

  const { data: vinculos = [], isLoading } = useQuery({
    queryKey: ["staff-vinculos", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipe_excursoes")
        .select("id, status, papel, staff_user_id, convite_email, excursao:excursoes(id,titulo,destino,data_evento,cor)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Vinculo[];
    },
  });

  const ativos = vinculos.filter((v) => v.status === "ativo");
  const pendentes = vinculos.filter((v) => v.status === "pendente");

  async function responder(id: string, aceitar: boolean) {
    const update = aceitar
      ? { status: "ativo", staff_user_id: user!.id, convite_email: null }
      : { status: "recusado" };
    await supabase.from("equipe_excursoes").update(update).eq("id", id);
    qc.invalidateQueries({ queryKey: ["staff-vinculos"] });
  }

  return (
    <StaffShell title="Central Staff" subtitle="Suas excursões vinculadas">
      <section className="grid grid-cols-2 gap-3 mb-6">
        <Stat label="Excursões ativas" value={ativos.length} icon={Activity} tone="from-neon-green to-neon-purple" />
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
                        <p className="font-semibold text-sm truncate">{v.excursao?.titulo ?? "Excursão"}</p>
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
              Minhas excursões ({ativos.length})
            </h2>
            {ativos.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Você ainda não está vinculado a nenhuma excursão.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Aguarde um convite do organizador (excursionista).
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {ativos.map((v) =>
                  v.excursao ? (
                    <Link
                      key={v.id}
                      to="/staff/passageiros"
                      className="block glass rounded-2xl overflow-hidden hover:glow-primary transition"
                    >
                      <div className="h-20 relative" style={{ background: `linear-gradient(135deg, ${v.excursao.cor ?? "#a855f7"}, #22d3a4)` }}>
                        <div className="absolute inset-0 grid-bg opacity-40" />
                        <div className="absolute top-2 right-2"><Pill tone="green">{v.papel}</Pill></div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-display font-bold leading-tight">{v.excursao.titulo}</h3>
                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {v.excursao.destino}</span>
                          <span className="flex items-center gap-1"><Calendar className="size-3.5" /> {new Date(v.excursao.data_evento).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>
                    </Link>
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
