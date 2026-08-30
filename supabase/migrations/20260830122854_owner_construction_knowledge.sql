-- Keep approved knowledge readable by authorized managers, but make every
-- knowledge mutation owner-only at the database boundary.
drop policy if exists "aura_ai_reply_knowledge_manager_select" on public.aura_ai_reply_knowledge;
drop policy if exists "aura_ai_reply_knowledge_manager_insert" on public.aura_ai_reply_knowledge;
drop policy if exists "aura_ai_reply_knowledge_manager_update" on public.aura_ai_reply_knowledge;
drop policy if exists "aura_ai_reply_knowledge_manager_delete" on public.aura_ai_reply_knowledge;
drop policy if exists "aura_ai_reply_knowledge_owner_insert" on public.aura_ai_reply_knowledge;
drop policy if exists "aura_ai_reply_knowledge_owner_update" on public.aura_ai_reply_knowledge;
drop policy if exists "aura_ai_reply_knowledge_owner_delete" on public.aura_ai_reply_knowledge;

create policy "aura_ai_reply_knowledge_manager_select"
  on public.aura_ai_reply_knowledge
  for select
  to authenticated
  using ((select private.is_admin_or_staff()));

create policy "aura_ai_reply_knowledge_owner_insert"
  on public.aura_ai_reply_knowledge
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "aura_ai_reply_knowledge_owner_update"
  on public.aura_ai_reply_knowledge
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "aura_ai_reply_knowledge_owner_delete"
  on public.aura_ai_reply_knowledge
  for delete
  to authenticated
  using ((select private.is_admin()));

-- Owner-approved, durable clarification rules. These do not claim a current
-- price, live inventory, guaranteed delivery, or a code-compliant assembly.
insert into public.aura_ai_reply_knowledge (fact, category, source_path, enabled, reviewed_at)
values
  (
    'Avantia uses 5/8-inch as its normal Sheetrock option. Never silently replace an explicit customer thickness; ask whether the customer wants to keep their stated thickness or use 5/8-inch. Final thickness and fire rating must follow the plans, assembly requirements, and applicable code.',
    'drywall',
    '/shop/sheet-rock',
    true,
    now()
  ),
  (
    'In normal construction shorthand, a bare 2x4x8 means wood dimensional lumber. An explicit customer instruction for metal or another material always overrides this default.',
    'framing',
    '/shop/framing',
    true,
    now()
  ),
  (
    'For drywall screws, “1000 pc box” means 1,000 individual screws packaged as one 1,000-count box. It never means 1,000 boxes.',
    'drywall',
    '/shop/sheet-rock',
    true,
    now()
  ),
  (
    'For a drywall list with omitted shorthand details, matching tape defaults to one standard roll, a five-gallon compound bucket defaults to all-purpose compound, and a five-gallon primer bucket defaults to drywall primer. Any explicit customer selection overrides these defaults.',
    'drywall',
    '/shop/sheet-rock',
    true,
    now()
  ),
  (
    'Before matching thinset, collect the tile type and size, substrate, and installation location; the final product must follow the tile and thinset manufacturer requirements.',
    'tile',
    '/shop/tile-work',
    true,
    now()
  ),
  (
    'For a metal-stud request, collect stud width, length, gauge, and quantity before a manager confirms the material option.',
    'framing',
    '/shop/framing',
    true,
    now()
  ),
  (
    'For roofing shingles, collect the shingle type, color, and roof area before a manager confirms the material option.',
    'roofing',
    '/shop/roofing',
    true,
    now()
  )
on conflict (fact, source_path) do nothing;
