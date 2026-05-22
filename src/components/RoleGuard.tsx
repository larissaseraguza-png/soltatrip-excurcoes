import { Navigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRole, roleHome, type AppRole } from "@/hooks/use-role";

export function RoleGuard({ allow, children }: { allow: AppRole; children: React.ReactNode }) {
  const { user, loading: aLoading } = useAuth();
  const { role, loading: rLoading } = useRole();

  if (aLoading || rLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" />;
  if (!role) return <Navigate to="/auth" />;
  if (role !== allow) return <Navigate to={roleHome[role]} />;
  return <>{children}</>;
}
