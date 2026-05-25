import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useRoleForUser, roleHome, setActiveRole, type AppRole } from "@/hooks/use-role";

export function RoleGuard({ allow, children }: { allow: AppRole; children: React.ReactNode }) {
  const { user, loading: aLoading } = useAuth();
  const { roles, loading: rLoading } = useRoleForUser(user, aLoading);

  // Skeleton silencioso durante o carregamento (evita flash de conteúdo
  // protegido e mismatch de hidratação SSR).
  if (aLoading || rLoading) return <div className="min-h-[50vh]" aria-hidden />;
  if (!user) return <Navigate to="/auth" />;
  if (roles.length === 0) return <Navigate to="/auth" />;

  // Usuário tem o papel solicitado → marca como ativo (permite alternância
  // entre staff/passageiro/excursionista usando a mesma conta).
  if (roles.includes(allow)) {
    setActiveRole(allow);
    return <>{children}</>;
  }

  // Não tem esse papel: manda pra home do primeiro papel disponível.
  return <Navigate to={roleHome[roles[0]]} />;
}
