import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/excursionista/Shell";
import { Pin, Send, Plus, Bell } from "lucide-react";

export const Route = createFileRoute("/excursionista/chat")({
  head: () => ({ meta: [{ title: "Chat — SoltaTrip" }] }),
  component: Chat,
});

const msgs = [
  { from: "Staff SoltaTrip", text: "Embarque confirmado para 22h, Pç. da Sé. Cheguem 30min antes 💜", time: "10:24", staff: true },
  { from: "Marina Costa", text: "Pode levar mochila grande?", time: "10:30", staff: false, me: false },
  { from: "Você", text: "Pode sim, até 12kg. Lista de itens proibidos fixada no topo!", time: "10:32", staff: false, me: true },
  { from: "Sistema", text: "🎫 Júlia Ferreira realizou o pagamento PIX (R$ 480)", time: "10:45", system: true },
  { from: "Diego Almeida", text: "Vamos curtir!! 🔥🔥", time: "10:51", staff: false, me: false },
];

function Chat() {
  return (
    <Shell title="Comunidade" subtitle="42 membros · online" back="/excursionista">
      <div className="glass rounded-2xl p-3 mb-4 flex items-start gap-3 border-neon-pink/40">
        <Pin className="size-4 text-neon-pink mt-0.5" />
        <div className="flex-1">
          <p className="text-[10px] uppercase text-neon-pink font-bold tracking-wider">Fixado</p>
          <p className="text-xs">Embarque 22h · Pç. da Sé · Levar documento com foto</p>
        </div>
      </div>

      <div className="space-y-3 mb-24">
        {msgs.map((m, i) => {
          if (m.system) {
            return (
              <div key={i} className="mx-auto max-w-xs text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neon-green/15 text-neon-green text-[11px] font-medium">
                  <Bell className="size-3" /> {m.text}
                </div>
              </div>
            );
          }
          const mine = m.me;
          return (
            <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl p-3 ${
                mine
                  ? "bg-gradient-to-br from-neon-purple to-neon-pink text-primary-foreground glow-primary rounded-br-sm"
                  : m.staff
                    ? "glass border-neon-green/40 rounded-bl-sm"
                    : "glass rounded-bl-sm"
              }`}>
                <p className={`text-[10px] font-bold mb-1 ${
                  mine ? "text-primary-foreground/80" : m.staff ? "text-neon-green" : "text-neon-pink"
                }`}>{m.from}</p>
                <p className="text-sm">{m.text}</p>
                <p className={`text-[10px] mt-1 text-right ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{m.time}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-24 inset-x-0 px-4 z-30">
        <div className="max-w-screen-md mx-auto glass rounded-2xl p-2 flex items-center gap-2">
          <button className="size-10 grid place-items-center rounded-xl bg-muted">
            <Plus className="size-5" />
          </button>
          <input
            placeholder="Mensagem para o grupo…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          <button className="size-10 grid place-items-center rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink glow-primary">
            <Send className="size-5 text-primary-foreground" />
          </button>
        </div>
      </div>
    </Shell>
  );
}
