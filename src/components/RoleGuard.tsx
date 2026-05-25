import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useRoleForUser, roleHome, type AppRole } from "@/hooks/use-role";

export function RoleGuard({ allow, children }: { allow: AppRole; children: React.ReactNode }) {
  const { user, loading: aLoading } = useAuth();
  const { role, loading: rLoading } = useRoleForUser(user, aLoading);

  // Enquanto resolve auth/role, renderiza o shell silenciosamente para evitar
  // flash de loader de tela inteira em cada navegação.
  if (aLoading || rLoading) return <>{children}</>;
  if (!user) return <Navigate to="/auth" />;
  if (!role) return <Navigate to="/auth" />;
  if (role !== allow) return <Navigate to={roleHome[role]} />;
  return <>{children}</>;
}
