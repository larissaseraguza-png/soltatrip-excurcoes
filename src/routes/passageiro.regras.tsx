import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/passageiro/Shell";
import { FileCheck2, ShieldCheck } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/passageiro/regras")({
  component: Regras,
});

const blocos = [
  {
    titulo: "Regras gerais",
    itens: [
      "Cheguem 30 minutos antes do horário de embarque.",
      "Apresentar documento oficial com foto.",
      "Respeito ao staff, motorista e outros passageiros.",
    ],
  },
  {
    titulo: "Itens proibidos",
    itens: [
      "Bebidas alcoólicas dentro do ônibus.",
      "Objetos cortantes, inflamáveis ou ilícitos.",
      "Caixas de som em volume alto durante a noite.",
    ],
  },
  {
    titulo: "Termo de responsabilidade",
    itens: [
      "A SoltaTrip não se responsabiliza por objetos esquecidos.",
      "Cada passageiro responde por suas ações durante o evento.",
      "Cancelamentos seguem a política descrita no site.",
    ],
  },
];

function Regras() {
  const [aceito, setAceito] = useState(false);

  return (
    <Shell back="/passageiro" title="Regras e termos">
      <div className="glass rounded-3xl p-5 mb-5 flex items-center gap-3">
        <ShieldCheck className="size-8 text-neon-green" />
        <div>
          <h2 className="font-display font-bold">Embarque seguro</h2>
          <p className="text-xs text-muted-foreground">
            Leia atentamente antes de confirmar sua viagem.
          </p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {blocos.map((b) => (
          <div key={b.titulo} className="glass rounded-3xl p-5">
            <h3 className="font-display font-bold text-neon-pink mb-3">{b.titulo}</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              {b.itens.map((i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-neon-green mt-1">•</span>
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <label className="glass rounded-3xl p-5 flex items-start gap-3 cursor-pointer mb-4">
        <input
          type="checkbox"
          checked={aceito}
          onChange={(e) => setAceito(e.target.checked)}
          className="mt-1 size-5 accent-[oklch(0.75_0.28_145)]"
        />
        <div>
          <p className="font-bold">Li e concordo com os termos</p>
          <p className="text-xs text-muted-foreground">
            Ao marcar, você aceita as regras e o termo de responsabilidade da SoltaTrip.
          </p>
        </div>
      </label>

      <button
        disabled={!aceito}
        className="w-full h-14 rounded-2xl font-display font-bold bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground glow-primary disabled:opacity-40 disabled:glow-primary-none flex items-center justify-center gap-2"
      >
        <FileCheck2 className="size-5" /> Confirmar aceite
      </button>
    </Shell>
  );
}
