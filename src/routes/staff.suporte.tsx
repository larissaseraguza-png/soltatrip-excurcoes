import { createFileRoute, Link } from "@tanstack/react-router";
import { StaffShell } from "@/components/staff/Shell";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/staff/suporte")({
  component: Suporte,
});

function Suporte() {
  return (
    <StaffShell title="Suporte" subtitle="Comunicação operacional" back="/staff">
      <div className="glass rounded-2xl p-8 text-center">
        <MessageCircle className="size-10 mx-auto mb-3 text-neon-green" />
        <p className="text-sm text-muted-foreground mb-4">
          Use o canal de mensagens para falar com o organizador e a equipe.
        </p>
        <Link
          to="/staff/mensagens"
          className="inline-flex h-10 px-4 items-center justify-center rounded-xl bg-gradient-to-br from-neon-green to-neon-purple glow-primary text-primary-foreground text-sm font-bold"
        >
          Abrir mensagens
        </Link>
      </div>
    </StaffShell>
  );
}
