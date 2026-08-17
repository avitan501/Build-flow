revoke all on function public.record_site_page_view(text, text, text, text, text, text, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_site_page_view(text, text, text, text, text, text, text, uuid, text)
  to service_role;
