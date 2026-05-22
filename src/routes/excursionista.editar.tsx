import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/excursionista/Shell";
import { Image as ImageIcon, Palette, DollarSign, Users, Bus, MessageSquare, FileText, Save, Trash2 } from "lucide-react";

export const Route = createFileRoute("/excursionista/editar")({
  head: () => ({ meta: [{ title: "Editar excursão — SoltaTrip" }] }),
  component: EditTrip,
});

function EditTrip() {
  const colors = ["#a855f7", "#ec4899", "#10b981", "#06b6d4", "#f59e0b", "#ef4444"];
  return (
    <Shell title="Editar excursão" subtitle="Tomorrowland BR" back="/excursionista/excursao/tomorrowland-br">
      <Section icon={ImageIcon} title="Banner do evento">
        <div className="relative h-32 rounded-2xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-emerald-500 overflow-hidden grid place-items-center">
          <div className="absolute inset-0 grid-bg opacity-40" />
          <button className="relative glass rounded-full px-4 py-2 text-xs font-bold">
            Trocar imagem
          </button>
        </div>
      </Section>

      <Section icon={Palette} title="Cor do tema">
        <div className="flex gap-3">
          {colors.map((c, i) => (
            <button key={c} className={`size-10 rounded-2xl border-2 ${i === 0 ? "border-foreground scale-110 glow-primary" : "border-transparent"}`}
              style={{ background: c }} />
          ))}
        </div>
      </Section>

      <Section icon={DollarSign} title="Preços">
        <Field label="Valor por passageiro" value="R$ 480,00" />
        <Field label="Sinal mínimo" value="R$ 100,00" />
      </Section>

      <Section icon={Users} title="Vagas">
        <Field label="Total de vagas" value="46" />
        <Field label="Reservadas (staff)" value="2" />
      </Section>

      <Section icon={Bus} title="Ônibus">
        <Field label="Modelo" value="Marcopolo Paradiso 1800 DD" />
        <Field label="Placa" value="GHF-2025" />
      </Section>

      <Section icon={MessageSquare} title="Mensagens automáticas">
        <Toggle label="Confirmação de pagamento" on />
        <Toggle label="Lembrete 24h antes" on />
        <Toggle label="Aviso de embarque" on />
        <Toggle label="Pesquisa pós-evento" />
      </Section>

      <Section icon={FileText} title="Regras">
        <textarea
          defaultValue="Documento com foto obrigatório. Pulseira sempre visível. Horário de retorno improrrogável."
          className="w-full bg-input rounded-2xl p-3 text-sm outline-none border border-border focus:border-neon-pink min-h-24"
        />
      </Section>

      <div className="flex gap-3 mt-2">
        <button className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground font-bold glow-primary flex items-center justify-center gap-2">
          <Save className="size-4" /> Salvar
        </button>
        <button className="h-12 px-5 rounded-2xl border border-destructive/50 text-destructive font-bold flex items-center justify-center gap-2">
          <Trash2 className="size-4" /> Cancelar excursão
        </button>
      </div>
    </Shell>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof ImageIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-3xl p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="size-4 text-neon-pink" />
        <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <input defaultValue={value}
        className="mt-1 w-full bg-input rounded-xl px-4 h-11 text-sm outline-none border border-border focus:border-neon-pink" />
    </label>
  );
}

function Toggle({ label, on }: { label: string; on?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm">{label}</span>
      <div className={`w-11 h-6 rounded-full p-0.5 transition ${on ? "bg-gradient-to-r from-neon-purple to-neon-pink glow-primary" : "bg-muted"}`}>
        <div className={`size-5 rounded-full bg-background transition ${on ? "translate-x-5" : ""}`} />
      </div>
    </div>
  );
}
