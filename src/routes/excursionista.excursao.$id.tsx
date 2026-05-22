import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, StatusBadge } from "@/components/excursionista/Shell";
import { Calendar, MapPin, Clock, Bus, Edit3, Share2, Users, Wallet, Info, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/excursionista/excursao/$id")({
  head: () => ({ meta: [{ title: "Detalhes da excursão — SoltaTrip" }] }),
  component: TripDetails,
});

function TripDetails() {
  return (
    <Shell title="Tomorrowland BR" subtitle="12 de Outubro · 22h" back="/excursionista">
      <div className="relative rounded-3xl overflow-hidden h-48 mb-5 bg-gradient-to-br from-fuchsia-600 via-purple-600 to-emerald-500">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="absolute bottom-4 left-5 right-5">
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status="lotando" />
            <span className="text-xs text-white/80">42 / 46 vagas</span>
          </div>
          <h2 className="font-display text-2xl font-black text-white">Tomorrowland Brasil 2026</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Action icon={Edit3} label="Editar" to="/excursionista/editar" />
        <Action icon={Share2} label="Compartilhar" />
        <Action icon={Users} label="Passageiros" to="/excursionista/passageiros" />
        <Action icon={Wallet} label="Financeiro" to="/excursionista/financeiro" />
      </div>

      <Section title="Informações da viagem">
        <Info2 icon={Calendar} label="Data" value="12 Out 2026" />
        <Info2 icon={Clock} label="Saída" value="22:00 · Pç. da Sé, SP" />
        <Info2 icon={MapPin} label="Destino" value="Itu, SP · Parque Maeda" />
        <Info2 icon={Clock} label="Retorno" value="13 Out · 08:00" />
        <Info2 icon={Bus} label="Veículo" value="Ônibus leito · Placa GHF-2025" />
      </Section>

      <Link to="/excursionista/info" className="mt-4 glass rounded-3xl p-4 flex items-center gap-3 hover:glow-primary transition">
        <div className="size-10 rounded-2xl bg-neon-pink/20 grid place-items-center">
          <Info className="size-5 text-neon-pink" />
        </div>
        <div className="flex-1">
          <p className="font-display font-bold text-sm">Mais informações</p>
          <p className="text-xs text-muted-foreground">Motorista, regras, seguro, staff</p>
        </div>
        <ArrowRight className="size-5 text-muted-foreground" />
      </Link>
    </Shell>
  );
}

function Action({ icon: Icon, label, to }: { icon: typeof Edit3; label: string; to?: string }) {
  const cls = "glass rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:glow-primary transition";
  const content = (
    <>
      <Icon className="size-6 text-neon-pink" />
      <span className="text-xs font-medium">{label}</span>
    </>
  );
  return to ? <Link to={to} className={cls}>{content}</Link> : <button className={cls}>{content}</button>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-3xl p-5">
      <h3 className="font-display font-bold text-sm mb-4 text-muted-foreground uppercase tracking-wider">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Info2({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="size-9 rounded-xl bg-neon-purple/20 grid place-items-center">
        <Icon className="size-4 text-neon-green" />
      </div>
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
