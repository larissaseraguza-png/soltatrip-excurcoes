import { createFileRoute } from "@tanstack/react-router";
import { StaffShell, Pill } from "@/components/staff/Shell";
import { CheckCircle2, MessageCircle, UserCheck, Ban, Edit3, Phone, Mail, MapPin, FileText, Clock, Wallet } from "lucide-react";

export const Route = createFileRoute("/staff/passageiro/$id")({
  component: PassageiroDetalhe,
});

function PassageiroDetalhe() {
  const { id } = Route.useParams();

  return (
    <StaffShell title="Passageiro" subtitle={`ID ${id}`} back="/staff/passageiros">
      <div className="glass rounded-3xl p-5 mb-5 text-center">
        <div className="size-24 mx-auto rounded-full bg-gradient-to-br from-neon-purple to-neon-pink grid place-items-center font-display font-black text-3xl text-primary-foreground glow-primary mb-3">
          BM
        </div>
        <h2 className="text-xl font-display font-bold">Bianca Martins</h2>
        <p className="text-xs text-muted-foreground mb-3">CPF 123.456.789-00</p>
        <div className="flex justify-center gap-2">
          <Pill tone="green">embarcado</Pill>
          <Pill tone="pink">VIP</Pill>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5">
        <button className="h-11 rounded-xl bg-gradient-to-br from-neon-green to-neon-purple glow-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-2">
          <CheckCircle2 className="size-4" /> Confirmar pgto
        </button>
        <button className="h-11 rounded-xl glass text-xs font-bold flex items-center justify-center gap-2">
          <UserCheck className="size-4" /> Marcar presença
        </button>
        <button className="h-11 rounded-xl glass text-xs font-bold flex items-center justify-center gap-2">
          <MessageCircle className="size-4" /> Mensagem
        </button>
        <button className="h-11 rounded-xl glass text-xs font-bold flex items-center justify-center gap-2">
          <Edit3 className="size-4" /> Editar
        </button>
      </div>

      <Section title="Contato">
        <Row icon={Phone} label="Telefone" value="(11) 9 9821-4422" />
        <Row icon={Mail} label="Email" value="bianca.m@email.com" />
        <Row icon={MapPin} label="Cidade" value="São Paulo · SP" />
      </Section>

      <Section title="Viagem">
        <Row icon={MapPin} label="Ônibus" value="#01 — Tomorrowland BR" />
        <Row icon={UserCheck} label="Poltrona" value="12A (corredor)" />
        <Row icon={Clock} label="Check-in" value="22/05 · 19:42" />
      </Section>

      <Section title="Histórico financeiro">
        <div className="space-y-2">
          {[
            { d: "20/05", t: "PIX - Entrada", v: "R$ 250,00", s: "pago" },
            { d: "21/05", t: "PIX - Restante", v: "R$ 450,00", s: "pago" },
            { d: "—", t: "Taxa de cancelamento", v: "—", s: "muted" },
          ].map((p, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-background/40">
              <Wallet className="size-4 text-neon-green" />
              <div className="flex-1">
                <div className="text-sm font-medium">{p.t}</div>
                <div className="text-[10px] text-muted-foreground">{p.d}</div>
              </div>
              <div className="text-sm font-bold">{p.v}</div>
              <Pill tone={p.s === "pago" ? "green" : "muted"}>{p.s}</Pill>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Comprovantes">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2].map((n) => (
            <div key={n} className="aspect-square rounded-xl glass grid place-items-center">
              <FileText className="size-6 text-neon-purple" />
            </div>
          ))}
          <button className="aspect-square rounded-xl border-2 border-dashed border-border/60 grid place-items-center text-xs text-muted-foreground">
            + anexar
          </button>
        </div>
      </Section>

      <Section title="Observações">
        <div className="glass rounded-xl p-3 text-sm text-muted-foreground italic">
          "Alérgica a amendoim. Embarque preferencial pelo portão B."
        </div>
      </Section>

      <button className="w-full h-11 rounded-xl bg-destructive/20 text-destructive font-bold text-sm flex items-center justify-center gap-2 mt-4">
        <Ban className="size-4" /> Bloquear passageiro
      </button>
    </StaffShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{title}</h3>
      <div className="glass rounded-2xl divide-y divide-border/60">{children}</div>
    </section>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="p-3 flex items-center gap-3">
      <Icon className="size-4 text-neon-green" />
      <div className="text-xs text-muted-foreground flex-1">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
