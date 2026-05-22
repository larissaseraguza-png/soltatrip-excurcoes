import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/excursionista/Shell";
import { Bus, User, Clock, ShieldCheck, AlertTriangle, MapPin, Users, FileText } from "lucide-react";

export const Route = createFileRoute("/excursionista/info")({
  head: () => ({ meta: [{ title: "Informações da viagem — SoltaTrip" }] }),
  component: InfoPage,
});

function InfoPage() {
  return (
    <Shell title="Informações da viagem" subtitle="Tomorrowland BR" back="/excursionista/excursao/tomorrowland-br">
      <div className="space-y-4">
        <Card icon={Bus} title="Ônibus" lines={["Marcopolo Paradiso 1800 DD", "Placa GHF-2025 · Leito-cama", "46 poltronas reclináveis"]} />
        <Card icon={User} title="Motorista" lines={["Carlos Henrique Mendes", "20 anos de estrada · CNH E", "+55 11 9..854"]} />
        <Card icon={Clock} title="Horários" lines={["Embarque: 21:30", "Saída: 22:00 — Pç. da Sé", "Retorno: 13 Out · 08:00"]} />
        <Card icon={MapPin} title="Embarque" lines={["Praça da Sé, São Paulo", "Próximo à estação de metrô", "Ponto sinalizado com totem SoltaTrip"]} />
        <Card icon={Users} title="Staff responsável" lines={["Bia (líder) · +55 11 9..222", "Pedro (apoio) · +55 11 9..931"]} tone="green" />
        <Card icon={ShieldCheck} title="Seguro viagem" lines={["Cobertura completa Porto Seguro", "Apólice nº 8829-1A", "Vigência até 14/10/2026"]} tone="green" />
        <Card icon={AlertTriangle} title="Itens proibidos" lines={["Bebidas alcoólicas no ônibus", "Substâncias ilícitas", "Garrafas de vidro · Objetos pontiagudos"]} tone="red" />
        <Card icon={FileText} title="Regras gerais" lines={["Documento com foto obrigatório", "Pulseira da excursão sempre visível", "Horário de retorno é improrrogável"]} />
      </div>
    </Shell>
  );
}

function Card({ icon: Icon, title, lines, tone = "purple" }: {
  icon: typeof Bus; title: string; lines: string[]; tone?: "purple" | "green" | "red";
}) {
  const colors = {
    purple: "bg-neon-purple/20 text-neon-pink",
    green: "bg-neon-green/15 text-neon-green",
    red: "bg-destructive/15 text-destructive",
  }[tone];
  return (
    <div className="glass rounded-3xl p-4 flex gap-4">
      <div className={`size-11 rounded-2xl grid place-items-center shrink-0 ${colors}`}>
        <Icon className="size-5" />
      </div>
      <div className="flex-1">
        <h3 className="font-display font-bold text-sm mb-1">{title}</h3>
        <ul className="space-y-0.5">
          {lines.map((l) => <li key={l} className="text-xs text-muted-foreground">{l}</li>)}
        </ul>
      </div>
    </div>
  );
}
