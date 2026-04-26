create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  company_name text,
  role text not null default 'client' check (role in ('admin', 'staff', 'client')),
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected', 'suspended')),
  is_active boolean not null default true,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
