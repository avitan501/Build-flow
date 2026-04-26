create table if not exists public.approval_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (action in ('approved', 'rejected', 'suspended', 'role_changed')),
  old_role text,
  new_role text,
  old_approval_status text,
  new_approval_status text,
  reason text,
  performed_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.approval_actions enable row level security;
