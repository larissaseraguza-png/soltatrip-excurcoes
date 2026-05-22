import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/passageiro/Shell";
import { Pin, Send, MapPin, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/passageiro/chat")({
  component: Chat,
});

const mensagens = [
  { tipo: "sistema", txt: "🚌 Ônibus 02 saiu da garagem", hora: "05:30" },
  {
    tipo: "staff",
    autor: "Júlia · Staff",
    txt: "Bom dia time! Embarque rolando agora na Paulista. Cheguem 30 min antes 💜",
    hora: "05:35",
  },
  { tipo: "passageiro", autor: "Você", txt: "Chegando aí em 10 min!", hora: "05:42" },
  {
    tipo: "alerta",
    txt: "⚠️ Mudança de horário: saída adiada para 06:15 por conta do trânsito.",
    hora: "05:50",
  },
  {
    tipo: "staff",
    autor: "Rafa · Bus 02",
    txt: "Pulseiras serão entregues no embarque. Tragam documento!",
    hora: "06:02",
  },
];

function Chat() {
  return (
    <Shell title="Chat da excursão" subtitle="Tomorrowland · Bus 02">
      <div className="glass rounded-2xl p-4 mb-4 border-l-4 border-neon-pink flex items-start gap-3">
        <Pin className="size-4 text-neon-pink mt-0.5" />
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-neon-pink font-bold">
            Aviso fixado
          </p>
          <p className="text-sm mt-1">
            Embarque dia <b>12/10 às 06:00</b> · Av. Paulista, 1578.
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {mensagens.map((m, i) => {
          if (m.tipo === "sistema")
            return (
              <div key={i} className="text-center">
                <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-muted text-muted-foreground">
                  <MapPin className="size-3" /> {m.txt} · {m.hora}
                </span>
              </div>
            );
          if (m.tipo === "alerta")
            return (
              <div
                key={i}
                className="glass rounded-2xl p-3 border border-yellow-400/40 bg-yellow-400/5 flex items-start gap-2"
              >
                <AlertCircle className="size-4 text-yellow-300 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm">{m.txt}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{m.hora}</p>
                </div>
              </div>
            );
          const mine = m.tipo === "passageiro";
          return (
            <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  mine
                    ? "bg-gradient-to-br from-neon-purple to-neon-pink text-primary-foreground rounded-br-sm"
                    : "glass rounded-bl-sm"
                }`}
              >
                {!mine && (
                  <p className="text-[10px] font-bold text-neon-green mb-0.5">{m.autor}</p>
                )}
                <p className="text-sm">{m.txt}</p>
                <p className="text-[10px] opacity-70 text-right mt-1">{m.hora}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-24 left-0 right-0 px-5 z-30">
        <div className="max-w-screen-md mx-auto glass rounded-full px-4 py-2 flex items-center gap-2 shadow-2xl">
          <input
            placeholder="Mensagem para a excursão..."
            className="flex-1 bg-transparent outline-none text-sm py-2"
          />
          <button className="size-10 grid place-items-center rounded-full bg-gradient-to-br from-neon-purple to-neon-pink glow-primary">
            <Send className="size-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </Shell>
  );
}
