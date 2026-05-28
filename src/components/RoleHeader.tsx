import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bus, LogOut, Repeat, UserCircle2 } from "lucide-react";
import { signOutAndClean } from "@/lib/auth-cleanup";
import { roleHome, useRole, setActiveRole, type AppRole } from "@/hooks/use-role";
import { NotificationBell } from "@/components/NotificationBell";

const ROLE_LABEL: Record<AppRole, string> = {
  excursionista: "Excursionista",
  staff: "Staff",
  passageiro: "Passageiro",
};

export function RoleHeader({ role, label }: { role: AppRole; label: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { roles } = useRole();

  async function logout() {
    await signOutAndClean();
    queryClient.clear();
    navigate({ to: "/auth" });
  }

  function trocarPerfil(novo: AppRole) {
    if (novo === role) return;
    setActiveRole(novo);
    navigate({ to: roleHome[novo] });
  }

  const outros = roles.filter((r) => r !== role);

  return (
    <header className="sticky top-0 z-40 glass border-b border-border">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-2">
        <Link to={roleHome[role]} className="flex items-center gap-2 font-display font-bold min-w-0">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-neon-pink to-neon-purple">
            <Bus className="h-3.5 w-3.5 text-primary-foreground" />
          </span>
          <span className="text-gradient truncate">SoltaTrip</span>
          <span className="hidden sm:inline ml-2 text-[10px] font-bold tracking-[0.18em] text-muted-foreground">
            · {label}
          </span>
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          <NotificationBell />
          {outros.length > 0 && (
            <div className="relative group">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-secondary transition"
                aria-label="Trocar perfil"
              >
                <Repeat className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Trocar perfil</span>
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block group-focus-within:block min-w-[160px] rounded-xl border border-border bg-card shadow-lg overflow-hidden z-50">
                {outros.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => trocarPerfil(r)}
                    className="block w-full text-left px-3 py-2 text-xs font-semibold hover:bg-secondary"
                  >
                    Entrar como {ROLE_LABEL[r].toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Link
            to="/auth"
            onClick={async (e) => {
              e.preventDefault();
              await signOutAndClean();
              queryClient.clear();
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
