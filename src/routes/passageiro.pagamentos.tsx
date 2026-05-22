import { createFileRoute } from "@tanstack/react-router";
import { Shell, Pill } from "@/components/passageiro/Shell";
import { Copy, Upload, MessageCircle, CheckCircle2, Clock, FileText } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/passageiro/pagamentos")({
  component: Pagamentos,
});

function Pagamentos() {
  const [copied, setCopied] = useState(false);
  const pix = "soltatrip@pix.com.br";

  const parcelas = [
    { n: 1, valor: "R$ 250,00", status: "pago", data: "10 Jun" },
    { n: 2, valor: "R$ 250,00", status: "pago", data: "10 Jul" },
    { n: 3, valor: "R$ 250,00", status: "pendente", data: "10 Ago" },
    { n: 4, valor: "R$ 250,00", status: "futuro", data: "10 Set" },
  ];

  return (
    <Shell title="Pagamentos" subtitle="Tomorrowland Brasil">
      <div className="glass rounded-3xl p-6 mb-5 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 size-40 rounded-full bg-neon-green/20 blur-3xl" />
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Total da viagem</p>
        <p className="font-display font-black text-4xl bg-gradient-to-r from-neon-pink to-neon-green bg-clip-text text-transparent">
          R$ 1.000,00
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon-purple to-neon-green"
              style={{ width: "50%" }}
            />
          </div>
          <span className="text-sm font-bold text-neon-green">50%</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">R$ 500,00 pagos · R$ 500,00 restantes</p>
      </div>

      <div className="glass rounded-3xl p-5 mb-5 border border-neon-pink/30">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-neon-pink font-bold">
              PIX disponível
            </p>
            <p className="text-sm text-muted-foreground">Próxima parcela: R$ 250,00</p>
          </div>
          <Pill tone="pink">vence 10/08</Pill>
        </div>
        <div className="bg-background/50 rounded-2xl px-4 py-3 flex items-center justify-between">
          <code className="text-sm font-mono truncate">{pix}</code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(pix);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="ml-2 size-9 grid place-items-center rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink text-primary-foreground"
          >
            <Copy className="size-4" />
          </button>
        </div>
        {copied && <p className="text-xs text-neon-green mt-2">Chave copiada!</p>}
      </div>

      <h3 className="font-display font-bold mb-3">Parcelas</h3>
      <div className="space-y-2 mb-6">
        {parcelas.map((p) => (
          <div key={p.n} className="glass rounded-2xl p-4 flex items-center gap-3">
            <div
              className={`size-10 rounded-xl grid place-items-center ${
                p.status === "pago"
                  ? "bg-neon-green/20 text-neon-green"
                  : p.status === "pendente"
                    ? "bg-yellow-400/20 text-yellow-300"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {p.status === "pago" ? <CheckCircle2 className="size-5" /> : <Clock className="size-5" />}
            </div>
            <div className="flex-1">
              <p className="font-semibold">Parcela {p.n}/4</p>
              <p className="text-xs text-muted-foreground">Venc. {p.data}</p>
            </div>
            <div className="text-right">
              <p className="font-display font-bold">{p.valor}</p>
              <Pill tone={p.status === "pago" ? "green" : p.status === "pendente" ? "yellow" : "muted"}>
                {p.status}
              </Pill>
            </div>
          </div>
        ))}
      </div>

      <h3 className="font-display font-bold mb-3">Comprovantes enviados</h3>
      <div className="space-y-2 mb-6">
        {[1, 2].map((i) => (
          <div key={i} className="glass rounded-2xl p-3 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-neon-purple/20 text-neon-purple grid place-items-center">
              <FileText className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">comprovante_pix_0{i}.pdf</p>
              <p className="text-xs text-muted-foreground">Aprovado · {i === 1 ? "10 Jun" : "10 Jul"}</p>
            </div>
            <Pill tone="green">ok</Pill>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <button className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl font-display font-bold bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground glow-primary">
          <Upload className="size-5" /> Enviar comprovante
        </button>
        <button className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold glass">
          <MessageCircle className="size-4" /> Falar com financeiro
        </button>
      </div>
    </Shell>
  );
}
