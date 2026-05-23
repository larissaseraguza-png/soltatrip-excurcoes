import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StaffShell, Pill } from "@/components/staff/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useStaffExcursao } from "@/hooks/use-staff-excursao";
import { Loader2, Shield } from "lucide-react";

export const Route = createFileRoute("/staff/equipe")({
  component: EquipeStaff,
});

function EquipeStaff() {
  const { excursao, loading } = useStaffExcursao();

  const { data: equipe = [] } = useQuery({
    queryKey: ["staff-equipe-list", excursao?.id],
    enabled: !!excursao?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipe_excursoes")
        .select("id,papel,status,staff_user_id,convite_email")
        .eq("excursao_id", excursao!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <StaffShell title="Equipe da excursão" subtitle={excursao?.titulo ?? ""} back="/staff">
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !excursao ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Nenhuma excursão ativa vinculada.
        </div>
      ) : (
        <>
          <p className="text-[11px] text-muted-foreground mb-3">
            Apenas o organizador pode adicionar ou remover membros da equipe.
          </p>
          {equipe.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">
              Sem membros cadastrados.
            </div>
          ) : (
            <div className="space-y-2">
              {(equipe as any[]).map((m) => (
                <div key={m.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-neon-green/30 to-neon-purple/20 grid place-items-center">
                    <Shield className="size-4 text-neon-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {m.staff_user_id ? "Membro ativo" : m.convite_email ?? "Convite pendente"}
                    </div>
                    <div className="text-[10px] text-muted-foreground capitalize">{m.papel}</div>
                  </div>
                  <Pill tone={m.status === "ativo" ? "green" : "yellow"}>{m.status}</Pill>
                </div>
              ))}
            </div>
          )}
          <div className="text-center mt-6">
            <Link to="/staff" className="text-xs text-neon-green">voltar ao painel</Link>
          </div>
        </>
      )}
    </StaffShell>
  );
}
