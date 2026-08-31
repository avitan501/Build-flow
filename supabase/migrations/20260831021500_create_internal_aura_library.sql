-- Internal, retrievable Aura operating knowledge. This store is deliberately
-- separate from aura_ai_reply_knowledge, which may be used to draft customer
-- replies. Rows here can never be marked customer-sendable.
create table if not exists public.aura_internal_knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 160),
  summary text not null check (char_length(summary) between 3 and 600),
  category text not null default 'operations' check (char_length(category) between 2 and 80),
  content_markdown text not null check (char_length(content_markdown) between 10 and 30000),
  tags text[] not null default '{}' check (cardinality(tags) <= 30),
  source_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(source_refs) = 'array'),
  status text not null default 'reviewed_internal' check (status in ('draft','reviewed_internal','archived')),
  retrieval_only boolean not null default true check (retrieval_only),
  customer_send_allowed boolean not null default false check (not customer_send_allowed),
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aura_internal_knowledge_documents_lookup_idx
  on public.aura_internal_knowledge_documents(status, category, updated_at desc);
create index if not exists aura_internal_knowledge_documents_tags_idx
  on public.aura_internal_knowledge_documents using gin(tags);
create index if not exists aura_internal_knowledge_documents_search_idx
  on public.aura_internal_knowledge_documents using gin(
    to_tsvector('english', title || ' ' || summary || ' ' || content_markdown)
  );

drop trigger if exists set_aura_internal_knowledge_documents_updated_at
  on public.aura_internal_knowledge_documents;
create trigger set_aura_internal_knowledge_documents_updated_at
before update on public.aura_internal_knowledge_documents
for each row execute function public.set_aura_updated_at();

alter table public.aura_internal_knowledge_documents enable row level security;
revoke all on table public.aura_internal_knowledge_documents from public, anon, authenticated;
grant all on table public.aura_internal_knowledge_documents to service_role;
grant select, insert, update, delete on table public.aura_internal_knowledge_documents to authenticated;

create policy "aura_internal_library_staff_read"
  on public.aura_internal_knowledge_documents for select to authenticated
  using ((select private.is_admin_or_staff()));
create policy "aura_internal_library_owner_insert"
  on public.aura_internal_knowledge_documents for insert to authenticated
  with check ((select private.is_admin()) and retrieval_only and not customer_send_allowed);
create policy "aura_internal_library_owner_update"
  on public.aura_internal_knowledge_documents for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()) and retrieval_only and not customer_send_allowed);
create policy "aura_internal_library_owner_delete"
  on public.aura_internal_knowledge_documents for delete to authenticated
  using ((select private.is_admin()));

insert into public.aura_internal_knowledge_documents
  (slug, title, summary, category, content_markdown, tags, source_refs, status, reviewed_at)
values
  (
    'aura-smooth-operations-playbook-v1',
    'Aura Smooth Operations Playbook',
    'Ten coordinated layers for reliable material intake, evidence, documents, supplier comparison, messaging, and end-to-end monitoring.',
    'aura-architecture',
    $playbook$
# Aura Smooth Operations Playbook

This is internal retrieval material. It is not customer copy and must never be sent automatically.

## 1. Central product brain
Use the Common Materials Map before generative AI. Keep one common generic product, up to three alternatives, required attributes, one first blocker, synonyms, common unit, compatibility blockers, evidence, confidence, and review date. A common product is never automatically the correct product.

## 2. Never ask twice
For each active request retain known, verified, missing, corrected, and last-asked fields. A short reply fills the field just asked. A new request cannot inherit product answers from an old request.

## 3. Pre-send answer gate
Before any customer reply, reject repeated questions, irrelevant answers, multiple questions, invented products, and unsupported price, stock, compatibility, delivery, payment, refund, cancellation, or order claims. If enough information exists, stop asking and prepare the request. Unsafe output remains Draft/Manager Review.

## 4. Evidence retrieval
Prefer approved Avantia catalog/history and manager-approved supplier documents, then authorized supplier APIs, licensed product content, official manufacturer data, and classification references. Preserve source, location, checked date, confidence, and expiration. Never present expired price evidence as current.

## 5. Manager correction learning
Store privacy-redacted corrections as review evidence. Promote only an explicit manager-approved correction to a reusable example or rule. Repetition may support Common for Avantia; one correction never proves an industry default.

## 6. PDF workflow
Preserve the original document. Let the manager select rows, edit quantity/unit/price, confirm category, vendor, contact, quote date, and free-or-priced delivery beside the selected items. Detect duplicates before catalog import. A request-linked supplier quote should become a comparison column.

## 7. Supplier comparison
Compare unit price, line total, delivery, tax, expiration, lead time, source, and checked date per request item. Keep unmatched lines visible. Supplier selection and every customer-facing price remain manager-approved actions.

## 8. Home Depot, Lowe's, Handoff, and other providers
Use only official APIs, licensed feeds, approved public product information, or legitimately received supplier documents. Do not scrape, reuse browser cookies, or expose credentials. Handoff, DDS, IDEA Connector, TRA-SER, and direct supplier adapters fail closed until official access is confirmed.

## 9. Messaging speed and reliability
Use a durable queue, idempotency keys, immediate safe acknowledgement, bounded retries, timeout fallback, delivery receipts, and latency timestamps. Alert managers on failed or stuck work. SMS and WhatsApp share identity and request state, but no channel may bypass the safety gate.

## 10. End-to-end synthetic verification
Continuously verify: inbound message, AI extraction, request creation, portal invitation, one-tap access, request visibility, PDF generation, follow-up ingestion, and manager handoff. Record the exact failed stage and latency. Synthetic tests must not create real customer orders or send unapproved commercial claims.
    $playbook$,
    array['aura','materials','retrieval','draft-only','documents','catalog','supplier-comparison','sms','monitoring'],
    '[{"kind":"internal","path":"/admin/ai-tools/internal-library"},{"kind":"common_map","path":"/admin/ai-tools/construction-knowledge"}]'::jsonb,
    'reviewed_internal',
    now()
  ),
  (
    'trusted-material-evidence-sources-v1',
    'Trusted Material Evidence Sources',
    'Approved source order, permitted use, and the claims each construction information source cannot prove.',
    'material-sources',
    $sources$
# Trusted Material Evidence Sources

Internal retrieval only. Source availability does not itself authorize customer-facing claims.

1. **Avantia manager-approved supplier documents** — may support scoped product identity and dated price observations. Preserve supplier, quote, unit, location/account scope, date, expiration, and original document. Private cost remains manager-only.
2. **Avantia reviewed request and purchase history** — may support Common for Avantia after privacy-safe aggregation. Historical prices are never current prices.
3. **Authorized direct supplier integrations** — may support product, public/private price, availability, and branch data only within written permissions and timestamped responses.
4. **DDS Unified Product Content API** — licensed normalized manufacturer content; not proof of current supplier stock or price.
5. **IDEA Connector** — licensed manufacturer/distributor product content, especially electrical; not a live price or availability feed.
6. **Trimble TRA-SER** — licensed trade and estimating content; not proof of a supplier SKU, stock, private price, or final selling price.
7. **Official manufacturer data** — authoritative for exact model identity, technical sheets, and instructions; not proof of local stock, price, or job compatibility.
8. **ETIM** — classification, features, values, units, and synonyms; not a product, compatibility, stock, or price authority.
9. **UNSPSC / UNGM** — broad procurement classification; not exact SKU or technical-specification evidence.
10. **Handoff** — adapter remains disabled until Handoff provides documented licensed server-to-server API access and permitted data-use terms. Never scrape or reuse a user session.

Confidence labels remain: Common Industry Default, Common Local Choice, Common for Avantia, Likely Match, Exact Match, and Needs Confirmation. Exact identity never automatically proves compatibility, code compliance, current stock, delivery, or customer intent.
    $sources$,
    array['sources','evidence','etim','unspsc','dds','idea','tra-ser','handoff','manufacturer','supplier'],
    '[{"publisher":"ETIM International","url":"https://www.etim-international.com/classification/model-information/"},{"publisher":"UNGM","url":"https://developer.ungm.org/Article/ContractAwardHelpers"},{"publisher":"DDS","url":"https://www.distributordatasolutions.com/software-partners/"},{"publisher":"IDEA","url":"https://idea4industry.com/"},{"publisher":"Trimble","url":"https://www.trimble.com/en/products/tradeservice/tra-ser-contractors"},{"publisher":"Handoff","url":"https://www.handoff.ai/"}]'::jsonb,
    'reviewed_internal',
    now()
  )
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  category = excluded.category,
  content_markdown = excluded.content_markdown,
  tags = excluded.tags,
  source_refs = excluded.source_refs,
  status = excluded.status,
  retrieval_only = true,
  customer_send_allowed = false,
  reviewed_at = excluded.reviewed_at;

comment on table public.aura_internal_knowledge_documents is
  'Owner-controlled internal Aura playbooks. Retrieval-only by constraint; no messaging trigger or customer-send path may consume these rows.';
