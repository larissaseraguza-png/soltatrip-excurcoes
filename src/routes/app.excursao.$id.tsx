import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, MapPin, Clock, Users, DollarSign, Loader2, Trash2, ChevronRight, Wallet } from "lucide-react";

export const Route = createFileRoute("/app/excursao/$id")({
  component: ExcursaoDetalhe,
});

function ExcursaoDetalhe() {
  const { id } = useParams({ from: "/app/excursao/$id" });
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["excursao", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("excursoes")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  async function handleDelete() {
    if (!confirm("Cancelar essa excursão?")) return;
    await supabase.from("excursoes").delete().eq("id", id);
    navigate({ to: "/app" });
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!data) return <p className="text-center text-muted-foreground py-20">Excursão não encontrada.</p>;

  return (
    <div>
      <Link to="/app" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div
        className="rounded-3xl overflow-hidden mb-6 h-40 relative glow-primary"
        style={{ background: `linear-gradient(135deg, ${data.cor ?? "#a855f7"}, #ec4899)` }}
      >
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        <div className="absolute bottom-4 left-5 right-5">
          <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-background/40 backdrop-blur">
            {data.status}
          </span>
          <h1 className="font-display text-2xl font-black mt-1 leading-tight">{data.titulo}</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Info icon={MapPin} label="Destino" value={data.destino} />
        <Info icon={Calendar} label="Data" value={new Date(data.data_evento).toLocaleDateString("pt-BR")} />
        <Info icon={Clock} label="Saída" value={data.horario_saida ?? "—"} />
        <Info icon={Clock} label="Retorno" value={data.horario_retorno ?? "—"} />
        <Info icon={Users} label="Vagas" value={data.total_vagas} />
        <Info icon={DollarSign} label="Preço" value={`R$ ${Number(data.preco).toFixed(2)}`} />
      </div>

      {data.ponto_embarque && (
        <div className="glass rounded-2xl p-4 mb-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Ponto de embarque</p>
          <p className="font-semibold">{data.ponto_embarque}</p>
        </div>
      )}

      {data.descricao && (
        <div className="glass rounded-2xl p-4 mb-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Sobre</p>
          <p className="text-sm">{data.descricao}</p>
        </div>
      )}

      <div className="space-y-2 mb-6">
        <NavCard to="/app/excursao/$id/passageiros" id={id} icon={Users} title="Passageiros" desc="Cadastrar, confirmar e gerenciar a lista" />
        <NavCard to="/app/excursao/$id/financeiro" id={id} icon={Wallet} title="Financeiro" desc="Lançar pagamentos e acompanhar entradas" />
      </div>

      <button
        onClick={handleDelete}
        className="w-full h-11 rounded-xl border border-red-500/30 text-red-400 font-semibold hover:bg-red-500/10 transition flex items-center justify-center gap-2"
      >
        <Trash2 className="h-4 w-4" /> Cancelar excursão
      </button>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-3">
      <Icon className="h-4 w-4 text-neon-pink mb-1.5" />
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
