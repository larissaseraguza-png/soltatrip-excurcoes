import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Shell } from "@/components/passageiro/Shell";
import { Calendar, MapPin, Clock, Bus, Info, QrCode, MessageCircle, Share2, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/passageiro/viagem/$id")({
  component: DetalhesViagem,
});

function DetalhesViagem() {
  const { id } = useParams({ from: "/passageiro/viagem/$id" });

  return (
    <Shell back="/passageiro" title="Detalhes da viagem">
      <div className="relative rounded-3xl overflow-hidden mb-6 glow-primary">
        <div className="h-48 bg-gradient-to-br from-neon-purple via-neon-pink to-neon-green relative">
          <div className="absolute inset-0 grid-bg opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5">
            <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full bg-neon-green/30 text-neon-green border border-neon-green/40">
              Confirmado #{id}
            </span>
            <h1 className="font-display font-black text-3xl mt-2 leading-tight">
              Tomorrowland Brasil
            </h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { icon: Calendar, label: "Data", value: "12 Out 2026" },
          { icon: MapPin, label: "Destino", value: "Itu, SP" },
          { icon: Clock, label: "Saída", value: "06:00" },
          { icon: Clock, label: "Retorno", value: "08:00 (13/10)" },
        ].map((i) => (
          <div key={i.label} className="glass rounded-2xl p-4">
            <i.icon className="size-4 text-neon-pink mb-2" />
            <p className="text-xs text-muted-foreground">{i.label}</p>
            <p className="font-bold text-sm">{i.value}</p>
          </div>
        ))}
      </div>

      <div className="glass rounded-3xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Bus className="size-5 text-neon-green" />
          <h3 className="font-display font-bold">Ponto de embarque</h3>
        </div>
        <p className="font-semibold">Av. Paulista, 1578 — Posto Shell</p>
        <p className="text-sm text-muted-foreground mt-1">São Paulo, SP — Chegue 30 min antes</p>
        <Link
          to="/passageiro/informacoes"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-neon-pink"
        >
          Ver no mapa <ChevronRight className="size-4" />
        </Link>
      </div>

      <div className="glass rounded-3xl p-5 mb-6 border-l-4 border-neon-pink">
        <div className="flex items-center gap-2 mb-2">
          <Info className="size-5 text-neon-pink" />
          <h3 className="font-display font-bold">Informações importantes</h3>
        </div>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Documento obrigatório (RG ou CNH)</li>
          <li>Proibido bebida alcoólica no ônibus</li>
          <li>Pulseira do evento será entregue no embarque</li>
        </ul>
      </div>

      <div className="space-y-3">
        <Link
          to="/passageiro/ticket"
          className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl font-display font-bold bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground glow-primary"
        >
          <QrCode className="size-5" /> Abrir ticket
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/passageiro/chat"
            className="flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold glass"
          >
            <MessageCircle className="size-4" /> Falar com staff
          </Link>
          <button className="flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold glass">
            <Share2 className="size-4" /> Compartilhar
          </button>
        </div>
      </div>
    </Shell>
  );
}
