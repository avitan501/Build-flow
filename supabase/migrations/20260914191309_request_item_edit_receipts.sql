-- Private server-only before/after receipts. No customer-visible event or browser drafts.
create table public.request_item_edit_receipts (
  id uuid primary key,
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  item_id uuid not null references public.quote_request_items(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  source_id uuid,
  source_snapshot jsonb,
  before_snapshot jsonb not null,
  after_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  undone_at timestamptz
);
alter table public.request_item_edit_receipts enable row level security;
revoke all on public.request_item_edit_receipts from public, anon, authenticated;
grant all on public.request_item_edit_receipts to service_role;

-- Called only after requireStaffProfile(customers). Service-only execution also prevents
-- untrusted callers from forging a receipt or supplying arbitrary before/after data.
create function public.staff_apply_request_item_edit(
  p_request_id uuid, p_item_id uuid, p_actor_id uuid, p_receipt_id uuid,
  p_expected jsonb, p_source_id uuid, p_source_expected jsonb,
  p_patch jsonb, p_undo boolean default false
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_item public.quote_request_items%rowtype;
  v_source public.quote_request_items%rowtype;
  v_receipt public.request_item_edit_receipts%rowtype;
  v_before jsonb;
  v_after jsonb;
  v_source_snapshot jsonb;
begin
  if not exists (
    select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.id = p_actor_id and p.is_active and p.approval_status = 'approved'
      and ((p.role = 'admin' and lower(btrim(u.email)) = 'avitanneto@gmail.com')
        or (p.role = 'staff' and lower(btrim(u.email)) in ('buildavantiap@gmail.com', 'info@fivetownsbuilders.com')))
  ) then raise exception 'Not authorized'; end if;
  -- Consistent lock order across edits, with original and organized rows in one lock set.
  perform 1 from public.quote_request_items where request_id = p_request_id
    and id in (p_item_id, p_source_id) order by id for update;
  select * into v_item from public.quote_request_items where id = p_item_id and request_id = p_request_id;
  if not found then raise exception 'Item not found'; end if;
  v_before := jsonb_build_object('name',v_item.name,'department',v_item.department,'quantity',v_item.quantity,'unit',v_item.unit,'metadata',v_item.metadata,'qualification_status',v_item.qualification_status);
  if p_source_id is not null then
    if v_item.metadata->>'source_item_id' is distinct from p_source_id::text then raise exception 'Source changed'; end if;
    select * into v_source from public.quote_request_items where id = p_source_id and request_id = p_request_id;
    if not found then raise exception 'Source changed'; end if;
    v_source_snapshot := jsonb_build_object('name',v_source.name,'department',v_source.department,'quantity',v_source.quantity,'unit',v_source.unit,'metadata',v_source.metadata,'qualification_status',v_source.qualification_status);
  elsif nullif(v_item.metadata->>'source_item_id','') is not null then raise exception 'Source required';
  end if;
  if v_before is distinct from p_expected or v_source_snapshot is distinct from p_source_expected then
    return jsonb_build_object('ok',false,'conflict',true);
  end if;
  if p_undo then
    select * into v_receipt from public.request_item_edit_receipts where id = p_receipt_id
      and request_id = p_request_id and item_id = p_item_id and actor_id = p_actor_id for update;
    if not found or v_receipt.undone_at is not null or v_receipt.after_snapshot is distinct from v_before
      or v_receipt.source_snapshot is distinct from v_source_snapshot then
      return jsonb_build_object('ok',false,'conflict',true);
    end if;
    v_after := v_receipt.before_snapshot;
    update public.request_item_edit_receipts set undone_at = now() where id = p_receipt_id;
  else
    if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'Invalid patch'; end if;
    v_after := v_before || p_patch;
    if exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('name','quantity','unit','metadata','qualification_status'))
      or length(v_after->>'name') not between 1 and 300
      or length(v_after->>'unit') not between 1 and 60
      or (v_after->>'quantity')::numeric <= 0
      or jsonb_typeof(v_after->'metadata') <> 'object'
      or coalesce(v_after->>'qualification_status','') not in ('pending','not_required','answered','skipped') then raise exception 'Invalid item'; end if;
    insert into public.request_item_edit_receipts(id,request_id,item_id,actor_id,source_id,source_snapshot,before_snapshot,after_snapshot)
      values(p_receipt_id,p_request_id,p_item_id,p_actor_id,p_source_id,v_source_snapshot,v_before,v_after);
  end if;
  update public.quote_request_items set name=v_after->>'name',quantity=(v_after->>'quantity')::numeric,
    unit=v_after->>'unit',metadata=v_after->'metadata',
    qualification_status=v_after->>'qualification_status'
    where id=p_item_id and request_id=p_request_id;
  return jsonb_build_object('ok',true,'receiptId',p_receipt_id);
end $$;
revoke all on function public.staff_apply_request_item_edit(uuid,uuid,uuid,uuid,jsonb,uuid,jsonb,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.staff_apply_request_item_edit(uuid,uuid,uuid,uuid,jsonb,uuid,jsonb,jsonb,boolean) to service_role;
