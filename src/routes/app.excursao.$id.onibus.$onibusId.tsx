import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { ArrowLeft, Bus, Clock, Users, MapPin, Loader2, Wallet, QrCode, MapPinned, ChevronRight, DollarSign } from "lucide-react";

export const Route = createFileRoute("/app/excursao/$id/onibus/$onibusId")({
  component: OnibusDetail,
});

function OnibusDetail() {
  const { id, onibusId } = useParams({ from: "/app/excursao/$id/onibus/$onibusId" });

  const { data: onibus, isLoading } = useQuery({
    queryKey: ["onibus-detail", onibusId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onibus")
        .select("*")
        .eq("id", onibusId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["onibus-stats", onibusId],
    queryFn: async () => {
      const [{ data: pax }, { data: seats }, { data: pontos }, { data: pagamentos }] = await Promise.all([
        supabase.from("passageiros").select("id, status, payment_status, total_price, amount_paid").eq("onibus_id", onibusId),
        supabase.from("seats").select("id, occupied").eq("onibus_id", onibusId),
        supabase.from("pontos_embarque").select("id").eq("onibus_id", onibusId),
        supabase.from("pagamentos").select("valor, status").eq("onibus_id", onibusId),
      ]);
      const ativos = (pax ?? []).filter((p: any) => p.status !== "cancelado");
      const arrecadado = (pagamentos ?? [])
        .filter((p: any) => p.status === "pago" || p.status === "confirmado")
        .reduce((sum: number, p: any) => sum + Number(p.valor ?? 0), 0);
      return {
        passageiros: ativos.length,
        seatsOcupadas: (seats ?? []).filter((s: any) => s.occupied).length,
        seatsTotal: (seats ?? []).length,
        pontos: (pontos ?? []).length,
        arrecadado,
      };
    },
  });

  useRealtimeSync(
    `onibus-detail-${onibusId}`,
    [
      { table: "onibus", filter: `id=eq.${onibusId}` },
      { table: "passageiros", filter: `onibus_id=eq.${onibusId}` },
      { table: "seats", filter: `onibus_id=eq.${onibusId}` },
      { table: "pagamentos", filter: `onibus_id=eq.${onibusId}` },
    ],
    [["onibus-detail", onibusId], ["onibus-stats", onibusId]],
  );

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!onibus) return <p className="text-center text-muted-foreground py-20">Ônibus não encontrado.</p>;

  return (
    <div>
      <Link to="/app/excursao/$id/onibus" params={{ id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="glass rounded-3xl p-5 mb-5">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center shrink-0">
            <Bus className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-black leading-tight">{onibus.nome}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
              {onibus.horario_saida && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />Saída {onibus.horario_saida}</span>}
              {onibus.horario_retorno && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />Retorno {onibus.horario_retorno}</span>}
              {onibus.ponto_partida && <span className="inline-flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{onibus.ponto_partida}</span>}
            </div>
            {!onibus.ativo && (
              <span className="inline-block mt-2 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">Inativo</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Stat icon={Users} label="Passageiros" value={`${stats?.passageiros ?? 0}/${onibus.capacidade}`} />
        <Stat icon={Bus} label="Poltronas" value={`${stats?.seatsOcupadas ?? 0}/${stats?.seatsTotal ?? onibus.capacidade}`} />
        <Stat icon={MapPinned} label="Embarques" value={stats?.pontos ?? 0} />
        <Stat icon={DollarSign} label="Arrecadado" value={`R$ ${(stats?.arrecadado ?? 0).toFixed(2)}`} />
      </div>

      <div className="space-y-2">
        <NavCard to="/app/excursao/$id/passageiros" params={{ id }} search={{ onibus: onibusId }} icon={Users} title="Passageiros deste ônibus" desc="Lista filtrada apenas deste ônibus" />
        <NavCard to="/app/excursao/$id/pontos" params={{ id }} search={{ onibus: onibusId }} icon={MapPinned} title="Pontos de embarque" desc="Locais de embarque exclusivos deste ônibus" />
        <NavCard to="/app/excursao/$id/financeiro" params={{ id }} search={{ onibus: onibusId }} icon={Wallet} title="Financeiro" desc="Pagamentos e entradas deste ônibus" />
        <NavCard to="/app/excursao/$id/checkin" params={{ id }} search={{ onibus: onibusId }} icon={QrCode} title="Check-in" desc="Embarque por QR Code deste ônibus" />
      </div>

      <p className="text-[11px] text-muted-foreground text-center mt-6">
        Cada ônibus tem assentos, embarques, passageiros e check-in independentes.
      </p>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-3">
      <Icon className="h-4 w-4 text-neon-pink mb-1.5" />
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function NavCard({ to, params, search, icon: Icon, title, desc }: any) {
  return (
    <Link
      to={to}
      params={params}
      search={search}
      className="glass rounded-2xl p-4 flex items-center gap-3 hover:border-neon-pink/40 transition border border-transparent"
    >
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
