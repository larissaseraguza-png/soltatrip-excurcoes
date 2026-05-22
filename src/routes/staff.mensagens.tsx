import { createFileRoute } from "@tanstack/react-router";
import { StaffShell, Pill } from "@/components/staff/Shell";
import { Send, Hash, Megaphone, Users, Zap, Search } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/staff/mensagens")({
  component: Mensagens,
});

const CANAIS = [
  { name: "geral", icon: Hash, unread: 0, tone: "muted" },
  { name: "avisos", icon: Megaphone, unread: 3, tone: "pink" },
  { name: "ônibus-01", icon: Users, unread: 5, tone: "green" },
  { name: "ônibus-02", icon: Users, unread: 0, tone: "muted" },
  { name: "staff-only", icon: Zap, unread: 1, tone: "purple" },
];

const MSGS = [
  { who: "Diego R.", role: "Master", msg: "Pessoal, ajuste no roteiro do ônibus #03, sairemos 15 min mais cedo.", t: "10:42", tone: "pink" },
  { who: "Larissa A.", role: "Ops", msg: "Confirmado! Já notifiquei os passageiros do #03.", t: "10:45", tone: "green" },
  { who: "Sistema", role: "Auto", msg: "🔔 5 pagamentos PIX confirmados nos últimos 10 min.", t: "10:48", tone: "purple" },
  { who: "Bruno T.", role: "Embarque", msg: "Portão B aberto, começando check-in.", t: "10:52", tone: "green" },
  { who: "Aline V.", role: "Suporte", msg: "Recebi 2 dúvidas sobre bagagem, respondendo agora.", t: "10:55", tone: "green" },
];

function Mensagens() {
  const [canal, setCanal] = useState("avisos");
  return (
    <StaffShell title="Central de Mensagens" subtitle="Comunicação interna · ao vivo">
      <div className="glass rounded-2xl p-3 flex items-center gap-2 mb-4">
        <Search className="size-4 text-muted-foreground ml-2" />
        <input placeholder="Buscar canais ou mensagens…" className="flex-1 bg-transparent outline-none text-sm" />
      </div>

      <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Canais</h3>
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 mb-4">
        {CANAIS.map((c) => (
          <button
            key={c.name}
            onClick={() => setCanal(c.name)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl whitespace-nowrap text-xs font-bold border transition ${
              canal === c.name
                ? "bg-gradient-to-br from-neon-green/30 to-neon-purple/20 border-neon-green text-neon-green glow-primary"
                : "glass border-border/60 text-muted-foreground"
            }`}
          >
            <c.icon className="size-3.5" />
            {c.name}
            {c.unread > 0 && (
              <span className="size-4 grid place-items-center rounded-full bg-neon-pink text-background text-[9px] font-black">
                {c.unread}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl p-3 mb-3 flex items-center gap-3">
        <Megaphone className="size-5 text-neon-pink" />
        <div className="flex-1 text-xs">
          <div className="font-bold">#{canal}</div>
          <div className="text-muted-foreground">12 membros · 3 staff online</div>
        </div>
        <Pill tone="green">live</Pill>
      </div>

      <section className="space-y-3 mb-5">
        {MSGS.map((m, i) => (
          <div key={i} className="flex gap-3">
            <div className={`size-10 rounded-full grid place-items-center font-display font-black text-primary-foreground shrink-0 ${
              m.who === "Sistema"
                ? "bg-gradient-to-br from-neon-purple to-neon-pink glow-primary"
                : "bg-gradient-to-br from-neon-green to-neon-purple"
            }`}>
              {m.who.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{m.who}</span>
                <Pill tone={m.tone as never}>{m.role}</Pill>
                <span className="text-[10px] text-muted-foreground ml-auto">{m.t}</span>
              </div>
              <div className="glass rounded-2xl px-3 py-2 text-sm">{m.msg}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="mb-5">
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Respostas rápidas</h3>
        <div className="flex flex-wrap gap-2">
          {["Embarque iniciado 🚍", "PIX confirmado ✅", "Atenção: atraso ⚠️", "Excursão lotada 🔥"].map((q) => (
            <button key={q} className="text-xs px-3 py-1.5 rounded-full glass border border-border/60">{q}</button>
          ))}
        </div>
      </section>

      <div className="fixed bottom-24 inset-x-0 px-4">
        <div className="max-w-screen-md mx-auto glass rounded-2xl p-2 flex items-center gap-2 shadow-2xl">
          <input placeholder={`Mensagem para #${canal}…`} className="flex-1 bg-transparent outline-none text-sm px-3" />
          <button className="size-10 grid place-items-center rounded-xl bg-gradient-to-br from-neon-green to-neon-purple glow-primary">
            <Send className="size-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </StaffShell>
  );
}
