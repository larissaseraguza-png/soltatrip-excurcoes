import { createFileRoute } from "@tanstack/react-router";
import { StaffShell, Pill } from "@/components/staff/Shell";
import { Plus, Edit3, Trash2, Phone, Shield } from "lucide-react";

export const Route = createFileRoute("/staff/equipe")({
  component: EquipeStaff,
});

const TEAM = [
  { nome: "Diego Rocha", cargo: "Master", perms: ["financeiro", "passageiros", "config"], tel: "(11) 9 9012-8821", online: true, tone: "green" },
  { nome: "Larissa A.", cargo: "Operações", perms: ["check-in", "ônibus"], tel: "(11) 9 9322-7711", online: true, tone: "green" },
  { nome: "Pedro Lima", cargo: "Financeiro", perms: ["financeiro"], tel: "(11) 9 8870-1234", online: false, tone: "muted" },
  { nome: "Aline V.", cargo: "Suporte", perms: ["chat", "ocorrências"], tel: "(11) 9 9450-9988", online: true, tone: "green" },
  { nome: "Bruno T.", cargo: "Embarque", perms: ["check-in"], tel: "(11) 9 9112-3344", online: false, tone: "muted" },
];

function EquipeStaff() {
  return (
    <StaffShell title="Equipe" subtitle="12 membros · 8 online">
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-2xl font-display font-black text-neon-green">12</div>
          <div className="text-[10px] text-muted-foreground uppercase">Total</div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-2xl font-display font-black text-neon-pink">8</div>
          <div className="text-[10px] text-muted-foreground uppercase">Online</div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-2xl font-display font-black text-neon-purple">4</div>
          <div className="text-[10px] text-muted-foreground uppercase">Cargos</div>
        </div>
      </div>

      <button className="w-full h-12 rounded-2xl bg-gradient-to-br from-neon-green to-neon-purple glow-primary text-primary-foreground font-bold flex items-center justify-center gap-2 mb-5">
        <Plus className="size-4" /> Adicionar membro
      </button>

      <div className="space-y-3">
        {TEAM.map((m) => (
          <div key={m.nome} className="glass rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="size-12 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink grid place-items-center font-display font-black text-primary-foreground">
                  {m.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                {m.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-neon-green border-2 border-background animate-pulse-glow" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{m.nome}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Phone className="size-3" /> {m.tel}
                </div>
              </div>
              <Pill tone={m.cargo === "Master" ? "pink" : "purple"}>
                {m.cargo}
              </Pill>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {m.perms.map((p) => (
                <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-background/60 border border-border/60 text-muted-foreground flex items-center gap-1">
                  <Shield className="size-2.5" /> {p}
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <button className="flex-1 h-9 rounded-xl glass text-xs font-semibold flex items-center justify-center gap-1.5">
                <Edit3 className="size-3.5" /> Permissões
              </button>
              <button className="size-9 grid place-items-center rounded-xl bg-destructive/20 text-destructive">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </StaffShell>
  );
}
