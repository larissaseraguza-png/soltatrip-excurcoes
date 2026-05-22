import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/passageiro/Shell";
import { Bus, User, Clock, MapPin, ShieldAlert, Phone, Navigation } from "lucide-react";

export const Route = createFileRoute("/passageiro/informacoes")({
  component: Informacoes,
});

function Informacoes() {
  return (
    <Shell back="/passageiro" title="Informações da viagem">
      <div className="glass rounded-3xl overflow-hidden mb-5">
        <div className="relative h-44 bg-gradient-to-br from-neon-purple/40 via-neon-pink/30 to-neon-green/40">
          <div className="absolute inset-0 grid-bg opacity-60" />
          <div className="absolute inset-0 grid place-items-center">
            <MapPin className="size-12 text-neon-pink animate-pulse-glow" />
          </div>
          <div className="absolute bottom-3 left-3 right-3 glass rounded-2xl p-3">
            <p className="text-xs text-muted-foreground">Embarque</p>
            <p className="font-bold text-sm">Av. Paulista, 1578 — São Paulo</p>
          </div>
        </div>
        <button className="w-full h-14 flex items-center justify-center gap-2 font-display font-bold bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground">
          <Navigation className="size-5" /> Abrir rota no mapa
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-5">
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <Bus className="size-6 text-neon-pink" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Ônibus</p>
            <p className="font-bold">02 · Marcopolo Paradiso · Placa ABC-1D23</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <User className="size-6 text-neon-green" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Motorista</p>
            <p className="font-bold">Carlos Mendes · CNH categoria D</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <Clock className="size-6 text-neon-purple" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Horários</p>
            <p className="font-bold">Saída 06:00 · Chegada prevista 11:00</p>
          </div>
        </div>
      </div>

      <div className="glass rounded-3xl p-5 mb-5 border-l-4 border-neon-pink">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="size-5 text-neon-pink" />
          <h3 className="font-display font-bold">Regras & itens proibidos</h3>
        </div>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>Documento com foto obrigatório</li>
          <li>Proibido bebidas alcoólicas no ônibus</li>
          <li>Proibido objetos cortantes / inflamáveis</li>
          <li>Respeite os horários de embarque</li>
          <li>Mantenha o ônibus limpo ♻️</li>
        </ul>
      </div>

      <div className="glass rounded-3xl p-5">
        <h3 className="font-display font-bold mb-3">Contato do staff</h3>
        <div className="space-y-2">
          {[
            { nome: "Júlia (Líder)", tel: "+55 11 98888-0001" },
            { nome: "Rafa (Bus 02)", tel: "+55 11 98888-0002" },
          ].map((s) => (
            <div key={s.nome} className="bg-background/50 rounded-2xl p-3 flex items-center gap-3">
              <div className="size-10 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink grid place-items-center">
                <Phone className="size-4 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{s.nome}</p>
                <p className="text-xs text-muted-foreground">{s.tel}</p>
              </div>
              <button className="px-3 h-9 rounded-xl glass text-xs font-bold">Ligar</button>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
