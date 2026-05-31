
REVOKE EXECUTE ON FUNCTION public.notification_mark_read(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notification_mark_all_read(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notification_dismiss(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notification_unread_count(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.notification_mark_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notification_mark_all_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notification_dismiss(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notification_unread_count(uuid) TO authenticated;
