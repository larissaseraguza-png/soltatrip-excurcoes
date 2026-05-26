import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useRoleForUser, roleHome, setActiveRole, type AppRole } from "@/hooks/use-role";
import { useSlowLoad } from "@/hooks/use-slow-load";
import { SlowFallback } from "@/components/SlowFallback";

export function RoleGuard({ allow, children }: { allow: AppRole; children: React.ReactNode }) {
  const { user, loading: aLoading } = useAuth();
  const { roles, loading: rLoading } = useRoleForUser(user, aLoading);
  const loading = aLoading || rLoading;
  // Se o gate de auth/role demorar mais que 5s (rede móvel ruim, sessão
  // corrompida), oferece saída manual em vez de spinner infinito.
  const slow = useSlowLoad(loading, 5000);

  if (loading) {
    if (slow) {
      return (
        <SlowFallback
          message="Não conseguimos validar sua sessão neste dispositivo. Tente entrar novamente."
          onRetry={() => window.location.reload()}
        />
      );
    }
    return <div className="min-h-[50vh]" aria-hidden />;
  }
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
