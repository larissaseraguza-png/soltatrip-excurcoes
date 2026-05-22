import { createFileRoute, Link } from "@tanstack/react-router";
import heroBus from "@/assets/hero-bus.jpg";
import {
  Bus, QrCode, Users, Wallet, MessageCircle, MapPin, Sparkles,
  Shield, BarChart3, Ticket, Radio, ArrowRight, Check,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SoltaTrip — Gestão de excursões para festivais e raves" },
      { name: "description", content: "Plataforma SaaS para organizar excursões de eventos, festivais e raves. Check-in QR, financeiro PIX, controle de passageiros e comunicação automatizada." },
      { property: "og:title", content: "SoltaTrip — Excursões de festivais, sem planilha" },
      { property: "og:description", content: "Chega de WhatsApp e planilhas. Gerencie passageiros, pagamentos e embarques num só app." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />
      <Hero />
      <Stats />
      <Personas />
      <Features />
      <Flow />
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-3">
        <div className="glass rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 font-display font-bold text-lg">
            <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-neon-pink to-neon-purple glow-primary">
              <Bus className="h-4 w-4 text-primary-foreground" />
            </span>
            <span className="text-gradient">SoltaTrip</span>
          </a>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#personas" className="hover:text-foreground transition">Para quem é</a>
            <a href="#features" className="hover:text-foreground transition">Recursos</a>
            <a href="#flow" className="hover:text-foreground transition">Como funciona</a>
          </nav>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition glow-primary"
          >
            Começar <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative pt-36 pb-24 sm:pt-44 sm:pb-32">
      <div className="absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 relative">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground mb-6">
            <Sparkles className="h-3.5 w-3.5 text-neon-pink" />
            Plataforma SaaS · Mobile + Web
          </span>
          <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl font-bold leading-[0.95] max-w-4xl">
            Excursões de <span className="text-gradient glow-text">festival</span>,
            sem planilha.
          </h1>
          <p className="mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground">
            SoltaTrip profissionaliza a organização de excursões para raves, festivais e eventos.
            Passageiros, pagamentos PIX, check-in por QR Code e comunicação — tudo num só app.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center gap-3">
            <Link to="/auth" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground glow-primary hover:opacity-90 transition">
              Criar minha excursão <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#personas" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 font-semibold hover:bg-secondary transition">
              Ver para quem é
            </a>
          </div>
        </div>

        <div className="relative mt-16 sm:mt-20">
          <div className="absolute -inset-4 bg-gradient-to-r from-neon-purple/30 via-neon-pink/30 to-neon-purple/30 blur-3xl rounded-3xl animate-pulse-glow" />
          <div className="relative glass rounded-3xl overflow-hidden border border-border">
            <img
              src={heroBus}
              alt="Ônibus de excursão SoltaTrip rumo a festival eletrônico"
              width={1920}
              height={1280}
              className="w-full h-[280px] sm:h-[420px] lg:h-[520px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-3">
              <FloatBadge icon={<QrCode className="h-4 w-4" />} label="Check-in 2.4s" tone="pink" />
              <FloatBadge icon={<Wallet className="h-4 w-4" />} label="PIX em tempo real" tone="purple" />
              <FloatBadge icon={<Users className="h-4 w-4" />} label="312 passageiros" tone="green" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FloatBadge({ icon, label, tone }: { icon: React.ReactNode; label: string; tone: "pink" | "purple" | "green" }) {
  const colors = {
    pink: "border-neon-pink/40 text-neon-pink",
    purple: "border-neon-purple/40 text-neon-purple",
    green: "border-neon-green/40 text-neon-green",
  }[tone];
  return (
    <div className={`glass rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-medium ${colors}`}>
      {icon}
      <span className="text-foreground">{label}</span>
    </div>
  );
}

function Stats() {
  const stats = [
    { value: "92%", label: "menos tempo organizando" },
    { value: "0", label: "planilhas necessárias" },
    { value: "2.4s", label: "por check-in via QR" },
    { value: "24/7", label: "suporte automatizado" },
  ];
  return (
    <section className="py-12 border-y border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="font-display text-3xl sm:text-4xl font-bold text-gradient">{s.value}</div>
            <div className="mt-1 text-xs sm:text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Personas() {
  const personas = [
    {
      tag: "STAFF / ORGANIZADOR",
      tone: "pink" as const,
      title: "Controle total da operação",
      desc: "Dashboard com arrecadação, pendências, check-in e divulgação. Você pilota a excursão como um app de startup.",
      features: ["Dashboard analítico", "Financeiro PIX completo", "Check-in por QR Code", "Divulgação automatizada"],
    },
    {
      tag: "EXCURSIONISTA",
      tone: "purple" as const,
      title: "Gerencie suas viagens",
      desc: "Liste excursões, organize vagas, controle pagamentos e fale com seus passageiros direto pelo app.",
      features: ["Minhas excursões", "Lista de passageiros", "Chat e avisos", "Editar e atualizar vagas"],
    },
    {
      tag: "PASSAGEIRO",
      tone: "green" as const,
      title: "Sua viagem na palma da mão",
      desc: "Ticket digital com QR, comprovantes PIX, regras da viagem e suporte rápido pelo WhatsApp.",
      features: ["Ticket digital QR", "Pagamentos e PIX", "Avisos e grupo", "Suporte e emergência"],
    },
  ];
  return (
    <section id="personas" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHead
          eyebrow="3 experiências, 1 plataforma"
          title={<>Feito para <span className="text-gradient">quem vive a estrada</span></>}
          sub="Cada tipo de usuário tem seu próprio fluxo, telas e poderes."
        />
        <div className="grid md:grid-cols-3 gap-5 mt-14">
          {personas.map((p, i) => (
            <PersonaCard key={p.tag} {...p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PersonaCard({
  tag, title, desc, features, tone, index,
}: {
  tag: string; title: string; desc: string; features: string[];
  tone: "pink" | "purple" | "green"; index: number;
}) {
  const accents = {
    pink: { border: "hover:border-neon-pink/60", glow: "from-neon-pink/30 to-transparent", text: "text-neon-pink" },
    purple: { border: "hover:border-neon-purple/60", glow: "from-neon-purple/30 to-transparent", text: "text-neon-purple" },
    green: { border: "hover:border-neon-green/60", glow: "from-neon-green/30 to-transparent", text: "text-neon-green" },
  }[tone];
  return (
    <div className={`group glass rounded-3xl p-7 transition-all duration-500 border ${accents.border} hover:-translate-y-1 relative overflow-hidden`}>
      <div className={`absolute -top-20 -right-20 h-48 w-48 bg-gradient-to-br ${accents.glow} rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <span className={`text-[10px] font-bold tracking-[0.18em] ${accents.text}`}>{tag}</span>
          <span className="text-xs text-muted-foreground font-mono">0{index + 1}</span>
        </div>
        <h3 className="font-display text-2xl font-bold leading-tight">{title}</h3>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{desc}</p>
        <ul className="mt-6 space-y-2.5">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-sm">
              <Check className={`h-4 w-4 ${accents.text}`} />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Features() {
  const items = [
    { icon: BarChart3, title: "Dashboard analítico", desc: "Arrecadação, pendências, próximas viagens e métricas em tempo real." },
    { icon: QrCode, title: "Check-in QR Code", desc: "Leitor integrado, presença automática, lista de embarcados ao vivo." },
    { icon: Wallet, title: "Financeiro PIX", desc: "Upload de comprovantes, status de pagamento e relatórios completos." },
    { icon: Ticket, title: "Ticket digital", desc: "Cada passageiro recebe QR, poltrona, destino e informações da viagem." },
    { icon: MessageCircle, title: "WhatsApp & avisos", desc: "Mensagens automáticas, grupo da viagem e comunicação rápida." },
    { icon: MapPin, title: "Pontos de embarque", desc: "Configure paradas, horários e mantenha todo mundo no ritmo certo." },
    { icon: Shield, title: "Identidade própria", desc: "Cada excursão com logo, cores e regras personalizadas." },
    { icon: Radio, title: "Notificações", desc: "Alertas em tempo real para staff, excursionistas e passageiros." },
  ];
  return (
    <section id="features" className="py-24 sm:py-32 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHead
          eyebrow="Recursos"
          title={<>Tudo que sua excursão precisa, <span className="text-gradient">e nada que não precisa</span></>}
          sub="Substitui o WhatsApp confuso, a planilha desatualizada e o caderninho do organizador."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-14">
          {items.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass rounded-2xl p-6 hover:border-primary/40 transition group">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 flex items-center justify-center mb-4 group-hover:glow-primary transition">
                <Icon className="h-5 w-5 text-neon-pink" />
              </div>
              <h4 className="font-display font-semibold text-base">{title}</h4>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Flow() {
  const steps = [
    { n: "01", t: "Crie a excursão", d: "Defina destino, ônibus, lotes, pontos de embarque e cores da sua marca." },
    { n: "02", t: "Divulgue o link", d: "Compartilhe no WhatsApp, redes sociais e venda vagas automaticamente." },
    { n: "03", t: "Receba via PIX", d: "Passageiros pagam, enviam comprovante e recebem ticket digital." },
    { n: "04", t: "Embarque com QR", d: "Bipe cada ticket, controle ausentes e parta sem dor de cabeça." },
  ];
  return (
    <section id="flow" className="py-24 sm:py-32 bg-card/20 border-y border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHead
          eyebrow="Como funciona"
          title={<>Do <span className="text-gradient">primeiro grito</span> ao último passageiro</>}
        />
        <div className="grid md:grid-cols-4 gap-5 mt-14">
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <div className="font-display text-6xl font-bold text-gradient opacity-80">{s.n}</div>
              <h4 className="mt-3 font-display font-semibold text-lg">{s.t}</h4>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="cta" className="py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative glass rounded-3xl p-10 sm:p-16 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/20 via-neon-pink/15 to-neon-green/10" />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[600px] bg-neon-pink/30 blur-3xl rounded-full animate-pulse-glow" />
          <div className="relative">
            <h2 className="font-display text-4xl sm:text-6xl font-bold leading-tight">
              Bora <span className="text-gradient glow-text">soltar</span> a próxima?
            </h2>
            <p className="mt-5 max-w-xl mx-auto text-muted-foreground">
              Crie sua excursão em minutos. Sem instalar nada, sem planilha, sem stress.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="#" className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-4 font-semibold text-primary-foreground glow-primary hover:opacity-90 transition">
                Criar conta grátis <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-7 py-4 font-semibold hover:bg-secondary transition">
                Falar com a gente
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) {
  return (
    <div className="text-center max-w-3xl mx-auto">
      <span className="text-[11px] font-bold tracking-[0.22em] text-neon-pink">{eyebrow}</span>
      <h2 className="mt-3 font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05]">{title}</h2>
      {sub && <p className="mt-4 text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-display font-bold">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-neon-pink to-neon-purple">
            <Bus className="h-3.5 w-3.5 text-primary-foreground" />
          </span>
          <span className="text-foreground">SoltaTrip</span>
        </div>
        <p>© 2026 SoltaTrip · Movido pela cena.</p>
      </div>
    </footer>
  );
}
