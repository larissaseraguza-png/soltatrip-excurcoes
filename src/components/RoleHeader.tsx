import { Link, useNavigate } from "@tanstack/react-router";
import { Bus, LogOut, UserCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { roleHome, type AppRole } from "@/hooks/use-role";

export function RoleHeader({ role, label }: { role: AppRole; label: string }) {
  const navigate = useNavigate();
  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }
  return (
    <header className="sticky top-0 z-40 glass border-b border-border">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        <Link to={roleHome[role]} className="flex items-center gap-2 font-display font-bold">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-neon-pink to-neon-purple">
            <Bus className="h-3.5 w-3.5 text-primary-foreground" />
          </span>
          <span className="text-gradient">SoltaTrip</span>
          <span className="hidden sm:inline ml-2 text-[10px] font-bold tracking-[0.18em] text-muted-foreground">
            · {label}
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/auth"
            onClick={async (e) => {
              e.preventDefault();
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
            title="Trocar de conta"
          >
            <UserCircle2 className="h-4 w-4" /> Trocar conta
          </Link>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </div>
    </header>
  );
}
