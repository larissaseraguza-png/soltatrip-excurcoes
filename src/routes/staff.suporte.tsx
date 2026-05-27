import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StaffShell } from "@/components/staff/Shell";
import { FestaSelectorBanner, NoFestaSelected } from "@/components/staff/FestaSelector";
import { useStaffExcursao } from "@/hooks/use-staff-excursao";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, ExternalLink, Loader2 } from "lucide-react";

export const Route = createFileRoute("/staff/suporte")({
  component: Suporte,
});

function Suporte() {
  const { excursao, loading } = useStaffExcursao();

  const { data: links } = useQuery({
    queryKey: ["staff-wa-links", excursao?.id],
    enabled: !!excursao?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("excursoes")
        .select("whatsapp_group_url, whatsapp_staff_group_url")
        .eq("id", excursao!.id)
        .maybeSingle();
      return data;
    },
  });

  return (
    <StaffShell title="Suporte" subtitle="Comunicação via WhatsApp" back="/staff">
      <FestaSelectorBanner />
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !excursao ? (
        <NoFestaSelected />
      ) : (
        <div className="space-y-3">
          <div className="glass rounded-2xl p-6 text-center">
            <MessageCircle className="size-10 mx-auto mb-3 text-neon-green" />
            <p className="text-sm text-muted-foreground">
              Toda comunicação da excursão acontece nos grupos de WhatsApp definidos pelo organizador.
            </p>
          </div>

          <LinkCard label="Grupo da staff" url={links?.whatsapp_staff_group_url ?? null} accent />
          <LinkCard label="Grupo dos passageiros" url={links?.whatsapp_group_url ?? null} />

          {!links?.whatsapp_group_url && !links?.whatsapp_staff_group_url && (
            <p className="text-xs text-muted-foreground text-center">
              O organizador ainda não cadastrou nenhum link.
            </p>
          )}
        </div>
      )}
    </StaffShell>
  );
}

function LinkCard({ label, url, accent }: { label: string; url: string | null; accent?: boolean }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`glass rounded-2xl p-4 flex items-center gap-3 hover:border-neon-green/50 border border-transparent transition`}
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${accent ? "bg-gradient-to-br from-neon-green to-neon-purple" : "bg-gradient-to-br from-neon-purple to-neon-pink"}`}>
        <MessageCircle className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{url}</p>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}
