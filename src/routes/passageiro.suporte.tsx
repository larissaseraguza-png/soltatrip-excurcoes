import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/passageiro/Shell";
import { Phone, MessageCircle, AlertOctagon, Wallet, ChevronDown } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/passageiro/suporte")({
  component: Suporte,
});

const faqs = [
  { q: "Como envio o comprovante de pagamento?", a: "Vá em Pagamentos → Enviar comprovante e anexe o arquivo PDF ou imagem." },
  { q: "Posso transferir minha vaga?", a: "Sim, entre em contato com o staff até 7 dias antes do evento." },
  { q: "Esqueci documentos, e agora?", a: "Sem documento o embarque não pode ser realizado. Procure o staff imediatamente." },
  { q: "Como sei o número da minha poltrona?", a: "Acesse seu Ticket Digital — a poltrona aparece junto com o QR Code." },
];

function Suporte() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Shell title="Suporte" subtitle="A gente te ajuda 24/7">
      <div className="grid grid-cols-1 gap-3 mb-5">
        <a
          href="https://wa.me/5511999990000"
          className="glass rounded-3xl p-5 flex items-center gap-4 border border-neon-green/30 hover:glow-primary transition"
        >
          <div className="size-14 rounded-2xl bg-neon-green/20 text-neon-green grid place-items-center">
            <MessageCircle className="size-7" />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold">WhatsApp do staff</p>
            <p className="text-xs text-muted-foreground">Resposta em até 10 min</p>
          </div>
        </a>
        <button className="glass rounded-3xl p-5 flex items-center gap-4 border border-destructive/40 text-left">
          <div className="size-14 rounded-2xl bg-destructive/20 text-destructive grid place-items-center animate-pulse-glow">
            <AlertOctagon className="size-7" />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold">Emergência 24h</p>
            <p className="text-xs text-muted-foreground">Acionar suporte urgente</p>
          </div>
        </button>
        <button className="glass rounded-3xl p-5 flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-neon-pink/20 text-neon-pink grid place-items-center">
            <Wallet className="size-7" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-display font-bold">Suporte financeiro</p>
            <p className="text-xs text-muted-foreground">Dúvidas sobre pagamento e PIX</p>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button className="h-14 rounded-2xl font-display font-bold bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground glow-primary flex items-center justify-center gap-2">
          <Phone className="size-4" /> Chamar suporte
        </button>
        <button className="h-14 rounded-2xl font-semibold glass flex items-center justify-center gap-2">
          <AlertOctagon className="size-4" /> Reportar problema
        </button>
      </div>

      <h3 className="font-display font-bold mb-3">Dúvidas frequentes</h3>
      <div className="space-y-2">
        {faqs.map((f, i) => (
          <button
            key={i}
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full glass rounded-2xl p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <p className="flex-1 font-semibold text-sm">{f.q}</p>
              <ChevronDown
                className={`size-4 text-muted-foreground transition ${open === i ? "rotate-180" : ""}`}
              />
            </div>
            {open === i && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.a}</p>
            )}
          </button>
        ))}
      </div>
    </Shell>
  );
}
