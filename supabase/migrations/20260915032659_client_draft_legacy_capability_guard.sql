-- Compatibility correction only. Legacy Save retains its original capability
-- authorization; the new mixed-route draft RPCs keep their named actor checks.
create or replace function public.assert_no_shared_client_quote_draft(p_comparison_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if (coalesce((select private.is_admin()),false)
      or coalesce((select private.has_staff_capability('suppliers')),false)) is not true then
    raise exception 'Supplier management permission is required.';
  end if;
  perform 1 from public.quote_comparisons where id=p_comparison_id for update nowait;
  if exists(select 1 from public.quote_comparison_client_drafts where comparison_id=p_comparison_id) then raise exception 'Shared client draft requires reviewed prepare' using errcode='40001'; end if;
end $$;
revoke all on function public.assert_no_shared_client_quote_draft(uuid) from public,anon,service_role;
grant execute on function public.assert_no_shared_client_quote_draft(uuid) to authenticated;
