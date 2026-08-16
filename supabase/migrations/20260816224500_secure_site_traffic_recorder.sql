revoke all on function public.record_site_page_view(text, text, text, text) from public, anon, authenticated;
revoke all on function public.record_site_page_view(text, text, text, text, text, text, text) from public, anon, authenticated;

grant execute on function public.record_site_page_view(text, text, text, text) to service_role;
grant execute on function public.record_site_page_view(text, text, text, text, text, text, text) to service_role;
