DELETE FROM public.notifications
 WHERE type = 'item.ordered'
   AND (data->>'pedido_id') IS NULL;