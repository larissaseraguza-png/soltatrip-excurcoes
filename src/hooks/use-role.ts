import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type AppRole = "excursionista" | "staff" | "passageiro";

export function useRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (authLoading) return;
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        setRole((data?.role as AppRole) ?? null);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [user, authLoading]);

  return { role, loading: authLoading || loading };
}

export const roleHome: Record<AppRole, "/app" | "/staff" | "/passageiro"> = {
  excursionista: "/app",
  staff: "/staff",
  passageiro: "/passageiro",
};
