import { createFileRoute, Link } from "@tanstack/react-router";
import { StaffShell } from "@/components/staff/Shell";
import { useStaffExcursao } from "@/hooks/use-staff-excursao";
import { Loader2, MapPin, Calendar, Clock, Lock } from "lucide-react";

export const Route = createFileRoute("/staff/configuracoes")({
  component: Configuracoes,
});

function Configuracoes() {
  const { excursao, loading } = useStaffExcursao();
  return (
    <StaffShell title="Informações da excursão" subtitle="Somente leitura" back="/staff">
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !excursao ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Nenhuma excursão ativa vinculada.
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl p-3 mb-4 flex items-center gap-2 border border-yellow-400/30 bg-yellow-400/5">
            <Lock className="size-4 text-yellow-300 shrink-0" />
            <div className="text-[11px] text-yellow-200">
              Configurações são geridas pelo organizador.
            </div>
          </div>
          <div className="glass rounded-2xl p-5 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Título</div>
              <div className="text-base font-display font-bold">{excursao.titulo}</div>
            </div>
            <Row icon={MapPin} label="Destino" value={excursao.destino ?? "—"} />
            <Row icon={Calendar} label="Data" value={new Date(excursao.data_evento).toLocaleDateString("pt-BR")} />
            <Row icon={Clock} label="Saída" value={excursao.horario_saida ?? "—"} />
            <Row icon={Clock} label="Retorno" value={excursao.horario_retorno ?? "—"} />
          </div>
          <div className="text-center mt-6">
            <Link to="/staff" className="text-xs text-neon-green">voltar ao painel</Link>
          </div>
        </>
      )}
    </StaffShell>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-xl bg-background/40">
      <Icon className="size-4 text-neon-green" />
      <div className="text-xs text-muted-foreground flex-1">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
