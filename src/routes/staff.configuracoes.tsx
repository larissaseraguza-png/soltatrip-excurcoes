import { createFileRoute } from "@tanstack/react-router";
import { StaffShell, Pill } from "@/components/staff/Shell";
import { Palette, Image as ImageIcon, FileText, Plug, Shield, CreditCard, Layers, Save } from "lucide-react";

export const Route = createFileRoute("/staff/configuracoes")({
  component: Configuracoes,
});

function Configuracoes() {
  const colors = ["#22c55e", "#a855f7", "#ec4899", "#06b6d4", "#f59e0b", "#ef4444"];
  return (
    <StaffShell title="Configurações" subtitle="Sistema SaaS · multi-organizadores">
      <Section icon={Palette} title="Identidade visual">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Nome do app" value="SoltaTrip" />
          <Field label="Slogan" value="Excursões raves" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Cor primária</div>
          <div className="flex gap-2 flex-wrap">
            {colors.map((c, i) => (
              <button key={c} className={`size-10 rounded-xl border-2 ${i === 0 ? "border-foreground glow-primary" : "border-transparent"}`} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </Section>

      <Section icon={ImageIcon} title="Logos & banners">
        <div className="grid grid-cols-2 gap-3">
          <UploadBox label="Logo principal" />
          <UploadBox label="Banner padrão" />
        </div>
      </Section>

      <Section icon={FileText} title="Regras e mensagens">
        <Field label="Regras gerais" value="Sem bebidas externas, embarque até 30min antes…" multiline />
        <Field label="Mensagem automática (boas-vindas)" value="Bem-vindo à excursão! Aguarde o link de pagamento." multiline />
      </Section>

      <Section icon={CreditCard} title="Métodos de pagamento">
        <Toggle label="PIX (Mercado Pago)" enabled />
        <Toggle label="Cartão de crédito" enabled />
        <Toggle label="Boleto bancário" />
        <Toggle label="Parcelamento até 6x" enabled />
      </Section>

      <Section icon={Plug} title="Integrações">
        <Toggle label="WhatsApp Business API" enabled />
        <Toggle label="Google Maps" enabled />
        <Toggle label="Resend (e-mails)" />
        <Toggle label="Webhook customizado" />
      </Section>

      <Section icon={Shield} title="Permissões padrão">
        <Toggle label="Excursionistas criam novas viagens" enabled />
        <Toggle label="Staff pode confirmar pagamentos" enabled />
        <Toggle label="Suporte pode acessar dados sensíveis" />
      </Section>

      <Section icon={Layers} title="Modo SaaS">
        <Toggle label="Multi-excursões simultâneas" enabled />
        <Toggle label="Multi-organizadores" enabled />
        <Toggle label="Modo white-label" />
        <div className="flex items-center justify-between p-3">
          <div>
            <div className="text-sm font-semibold">Plano atual</div>
            <div className="text-xs text-muted-foreground">Premium · até 5.000 passageiros/mês</div>
          </div>
          <Pill tone="pink">PREMIUM</Pill>
        </div>
      </Section>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <button className="h-12 rounded-xl glass font-bold text-sm">Cancelar</button>
        <button className="h-12 rounded-xl bg-gradient-to-br from-neon-green to-neon-purple glow-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2">
          <Save className="size-4" /> Salvar
        </button>
      </div>
    </StaffShell>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="size-4 text-neon-green" />
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground">{title}</h3>
      </div>
      <div className="glass rounded-2xl p-4 space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      {multiline ? (
        <textarea defaultValue={value} rows={2} className="w-full bg-background/40 rounded-xl px-3 py-2 text-sm outline-none border border-border/60 focus:border-neon-green resize-none" />
      ) : (
        <input defaultValue={value} className="w-full bg-background/40 rounded-xl px-3 py-2 text-sm outline-none border border-border/60 focus:border-neon-green" />
      )}
    </div>
  );
}

function Toggle({ label, enabled }: { label: string; enabled?: boolean }) {
  return (
    <div className="flex items-center justify-between p-2">
      <span className="text-sm font-medium">{label}</span>
      <button className={`w-11 h-6 rounded-full transition relative ${enabled ? "bg-neon-green glow-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-background transition ${enabled ? "right-0.5" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function UploadBox({ label }: { label: string }) {
  return (
    <button className="aspect-video rounded-xl border-2 border-dashed border-border/60 grid place-items-center text-xs text-muted-foreground hover:border-neon-green hover:text-neon-green transition">
      <div className="text-center">
        <ImageIcon className="size-5 mx-auto mb-1" />
        <div>{label}</div>
      </div>
    </button>
  );
}
