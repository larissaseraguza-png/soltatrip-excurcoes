import { createFileRoute } from "@tanstack/react-router";
import { Shell, Pill } from "@/components/passageiro/Shell";
import { Download, FileText, Bus, Armchair } from "lucide-react";

export const Route = createFileRoute("/passageiro/ticket")({
  component: Ticket,
});

function Ticket() {
  return (
    <Shell back="/passageiro" title="Ticket digital">
      <div className="relative rounded-[2rem] overflow-hidden glass p-6 glow-primary">
        <div className="absolute -top-20 -right-20 size-60 rounded-full bg-neon-pink/20 blur-3xl animate-pulse-glow" />
        <div className="absolute -bottom-20 -left-20 size-60 rounded-full bg-neon-green/20 blur-3xl animate-pulse-glow" />

        <div className="relative text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-neon-pink font-bold">
            SoltaTrip · Boarding Pass
          </p>
          <h2 className="font-display font-black text-2xl mt-2">Tomorrowland Brasil</h2>
          <p className="text-sm text-muted-foreground">12 Out 2026 · Itu, SP</p>

          <div className="my-6 mx-auto w-56 h-56 rounded-3xl bg-white p-4 grid place-items-center relative">
            <div
              className="absolute inset-0 rounded-3xl"
              style={{
                background:
                  "linear-gradient(45deg, oklch(0.42 0.09 145) 0%, oklch(0.58 0.14 145) 50%, oklch(0.72 0.16 145) 100%)",
                padding: "3px",
                WebkitMask:
                  "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
              }}
            />
            <QRPlaceholder />
          </div>

          <p className="font-display font-bold text-lg">Lucas Almeida</p>
          <p className="text-xs text-muted-foreground tracking-widest">
            ID #SOLTA-0428-TML
          </p>
        </div>

        <div className="relative my-6 border-t border-dashed border-border" />

        <div className="relative grid grid-cols-3 gap-3 text-center">
          <div>
            <Bus className="size-4 mx-auto text-neon-pink" />
            <p className="text-[10px] text-muted-foreground mt-1">Ônibus</p>
            <p className="font-display font-bold">02</p>
          </div>
          <div>
            <Armchair className="size-4 mx-auto text-neon-purple" />
            <p className="text-[10px] text-muted-foreground mt-1">Poltrona</p>
            <p className="font-display font-bold">14A</p>
          </div>
          <div>
            <div className="size-4 mx-auto rounded-full bg-neon-green animate-pulse-glow" />
            <p className="text-[10px] text-muted-foreground mt-1">Status</p>
            <p className="font-display font-bold text-neon-green text-sm">OK</p>
          </div>
        </div>

        <div className="relative mt-5 flex items-center justify-center gap-2">
          <Pill tone="green">pago</Pill>
          <Pill tone="purple">aguardando check-in</Pill>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        <button className="flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground glow-primary">
          <Download className="size-4" /> Salvar ticket
        </button>
        <button className="flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold glass">
          <FileText className="size-4" /> Comprovante
        </button>
      </div>
    </Shell>
  );
}

function QRPlaceholder() {
  return (
    <div className="relative w-full h-full grid grid-cols-12 grid-rows-12 gap-[2px]">
      {Array.from({ length: 144 }).map((_, i) => {
        const filled = ((i * 37 + 11) % 7) > 2;
        return (
          <div
            key={i}
            className={filled ? "bg-black rounded-[1px]" : "bg-transparent"}
          />
        );
      })}
      <div className="absolute top-0 left-0 size-10 border-[5px] border-black rounded-md bg-white" />
      <div className="absolute top-0 right-0 size-10 border-[5px] border-black rounded-md bg-white" />
      <div className="absolute bottom-0 left-0 size-10 border-[5px] border-black rounded-md bg-white" />
    </div>
  );
}
