import { createFileRoute } from "@tanstack/react-router";
import { Shell, Pill } from "@/components/passageiro/Shell";
import { Bell, Lock, LogOut, Pencil, Ticket } from "lucide-react";

export const Route = createFileRoute("/passageiro/perfil")({
  component: Perfil,
});

function Perfil() {
  return (
    <Shell title="Meu perfil">
      <div className="glass rounded-3xl p-6 mb-5 text-center relative overflow-hidden">
        <div className="absolute -top-20 -right-20 size-60 rounded-full bg-neon-pink/20 blur-3xl" />
        <div className="relative">
          <div className="mx-auto size-24 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink grid place-items-center glow-primary font-display font-black text-4xl text-primary-foreground">
            L
          </div>
          <h2 className="font-display font-black text-xl mt-3">Lucas Almeida</h2>
          <p className="text-sm text-muted-foreground">São Paulo, SP · +55 11 99999-0000</p>
          <div className="mt-2 flex justify-center gap-2">
            <Pill tone="green">cadastro verificado</Pill>
            <Pill tone="purple">VIP</Pill>
          </div>
          <button className="mt-4 inline-flex items-center gap-2 px-4 h-10 rounded-full glass font-semibold text-sm">
            <Pencil className="size-4" /> Editar perfil
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { v: "8", l: "viagens" },
          { v: "4", l: "festivais" },
          { v: "12k", l: "km rodados" },
        ].map((s) => (
          <div key={s.l} className="glass rounded-2xl p-4 text-center">
            <p className="font-display font-black text-2xl bg-gradient-to-r from-neon-pink to-neon-green bg-clip-text text-transparent">
              {s.v}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <h3 className="font-display font-bold mb-3">Histórico</h3>
      <div className="space-y-2 mb-6">
        {[
          { n: "Universo Paralello 2025", d: "Dez 2024", s: "concluída" },
          { n: "XXXPERIENCE", d: "Fev 2025", s: "concluída" },
          { n: "Time Warp Brasil", d: "Mai 2025", s: "concluída" },
        ].map((v) => (
          <div key={v.n} className="glass rounded-2xl p-3 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-neon-purple/20 text-neon-purple grid place-items-center">
              <Ticket className="size-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{v.n}</p>
              <p className="text-xs text-muted-foreground">{v.d}</p>
            </div>
            <Pill tone="muted">{v.s}</Pill>
          </div>
        ))}
      </div>

      <div className="glass rounded-3xl divide-y divide-border/60">
        {[
          { icon: Bell, label: "Notificações", hint: "Push, email, WhatsApp" },
          { icon: Lock, label: "Alterar senha", hint: "Segurança da conta" },
          { icon: LogOut, label: "Sair", hint: "Encerrar sessão", danger: true },
        ].map((i) => (
          <button
            key={i.label}
            className={`w-full flex items-center gap-3 p-4 text-left ${i.danger ? "text-destructive" : ""}`}
          >
            <i.icon className="size-5" />
            <div className="flex-1">
              <p className="font-semibold text-sm">{i.label}</p>
              <p className="text-xs text-muted-foreground">{i.hint}</p>
            </div>
          </button>
        ))}
      </div>
    </Shell>
  );
}
