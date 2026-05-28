import { Bell } from "lucide-react";
import { NotificationPanel } from "@/components/NotificationPanel";
import { useNotifications } from "@/hooks/useNotifications";
import type { NotifRole } from "@/lib/notifications/store";

type Variant = "glass" | "outline";

export function NotificationBell({
  role,
  variant = "glass",
}: {
  role: NotifRole;
  variant?: Variant;
}) {
  const { unread } = useNotifications(role);
  const display = unread > 99 ? "99+" : String(unread);

  const buttonClass =
    variant === "outline"
      ? "relative inline-flex items-center justify-center rounded-lg border border-border bg-card px-3 py-1.5 hover:bg-secondary transition"
      : "size-10 grid place-items-center rounded-full glass relative";

  const iconClass =
    variant === "outline" ? "h-4 w-4 text-foreground" : "size-5 text-muted-foreground";

  const badgeTop = variant === "outline" ? "-top-1 -right-1" : "-top-0.5 -right-0.5";

  return (
    <NotificationPanel role={role}>
      <button type="button" className={buttonClass} aria-label="Notificações">
        <Bell className={iconClass} />
        {unread > 0 && (
          <span
            className={`absolute ${badgeTop} min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold rounded-full bg-neon-pink text-white border-2 border-background`}
          >
            {display}
          </span>
        )}
      </button>
    </NotificationPanel>
  );
}
