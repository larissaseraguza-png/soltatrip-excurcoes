import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useRoleForUser, roleHome, type AppRole } from "@/hooks/use-role";

export function RoleGuard({ allow, children }: { allow: AppRole; children: React.ReactNode }) {
  const { user, loading: aLoading } = useAuth();
  const { role, loading: rLoading } = useRoleForUser(user, aLoading);

  // Durante loading: skeleton silencioso (nunca children — evita vazar conteúdo protegido e hydration mismatch).
  if (aLoading || rLoading) return <div className="min-h-[50vh]" aria-hidden />;
  if (!user) return <Navigate to="/auth" />;
  if (!role) return <Navigate to="/auth" />;
  if (role !== allow) return <Navigate to={roleHome[role]} />;
  return <>{children}</>;
}
