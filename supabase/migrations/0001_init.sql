-- FacturaFácil: Supabase schema, RLS and numbering function.
-- The local demo runs on SQLite (lib/db.ts). This migration is the Supabase
-- deployment path: it mirrors the same tables so the repository layer can be
-- swapped without changing the domain rules.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  nuit text,
  email text,
  phone text,
  whatsapp text,
  address text,
  city text,
  province text,
  website text,
  logo_path text,
  default_validity_days integer not null default 30 check (default_validity_days between 1 and 365),
  default_notes text,
  default_terms text,
  default_tax_bp integer not null default 1600 check (default_tax_bp between 0 and 10000),
  currency text not null default 'MZN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  company_name text,
  nuit text,
  email text,
  phone text,
  whatsapp text,
  address text,
  city text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  description text,
  type text not null check (type in ('produto', 'servico')),
  unit text not null default 'unidade',
  price_cents bigint not null default 0 check (price_cents >= 0),
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.customers (id),
  quotation_number text,
  title text,
  issue_date date not null,
  valid_until date not null,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'enviada', 'aceite', 'rejeitada', 'expirada')),
  subtotal_cents bigint not null default 0,
  discount_cents bigint not null default 0,
  quote_discount_cents bigint not null default 0,
  tax_cents bigint not null default 0,
  total_cents bigint not null default 0,
  notes text,
  terms text,
  issued_snapshot jsonb,
  issued_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, quotation_number)
);

create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  catalog_item_id uuid references public.catalog_items (id),
  description text not null,
  quantity_milli bigint not null check (quantity_milli > 0),
  unit text not null,
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  discount_bp integer not null default 0 check (discount_bp between 0 and 10000),
  tax_rate_bp integer not null default 0 check (tax_rate_bp between 0 and 10000),
  line_total_cents bigint not null,
  sort_order integer not null default 0
);

create table if not exists public.quotation_sequences (
  business_id uuid not null references public.businesses (id) on delete cascade,
  year integer not null,
  last_number integer not null,
  primary key (business_id, year)
);

create table if not exists public.quotation_share_tokens (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_business on public.customers (business_id, archived_at);
create index if not exists idx_catalog_business on public.catalog_items (business_id, is_active);
create index if not exists idx_quotations_business on public.quotations (business_id, created_at desc);
create index if not exists idx_quotations_customer on public.quotations (business_id, customer_id);
create index if not exists idx_quotation_items_quote on public.quotation_items (quotation_id, sort_order);
create index if not exists idx_share_tokens_quote on public.quotation_share_tokens (quotation_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.businesses where owner_user_id = auth.uid() limit 1;
$$;

create or replace function public.is_business_owner(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.businesses where id = target and owner_user_id = auth.uid());
$$;

-- Atomic sequence allocation. Issued numbers are never reused.
create or replace function public.allocate_quotation_number(p_business uuid, p_year integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  if p_business is null or p_business <> public.current_business_id() then
    raise exception 'not authorized';
  end if;

  insert into public.quotation_sequences (business_id, year, last_number)
  values (p_business, p_year, 1)
  on conflict (business_id, year)
  do update set last_number = public.quotation_sequences.last_number + 1
  returning last_number into v_next;

  return 'ORC-' || p_year::text || '-' || lpad(v_next::text, 4, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.customers enable row level security;
alter table public.catalog_items enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.quotation_sequences enable row level security;
alter table public.quotation_share_tokens enable row level security;

create policy "profiles_self" on public.profiles
  for all using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

create policy "businesses_owner" on public.businesses
  for all using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

create policy "customers_tenant" on public.customers
  for all using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy "catalog_tenant" on public.catalog_items
  for all using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy "quotations_tenant" on public.quotations
  for all using (public.is_business_owner(business_id))
  with check (
    public.is_business_owner(business_id)
    and exists (
      select 1 from public.customers c
      where c.id = customer_id and c.business_id = quotations.business_id
    )
  );

create policy "quotation_items_tenant" on public.quotation_items
  for all using (public.is_business_owner(business_id))
  with check (
    public.is_business_owner(business_id)
    and exists (
      select 1 from public.quotations q
      where q.id = quotation_id and q.business_id = quotation_items.business_id
    )
  );

create policy "sequences_tenant" on public.quotation_sequences
  for all using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy "share_tokens_tenant" on public.quotation_share_tokens
  for all using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

-- Public share links are resolved server-side with the service role after
-- hashing the token; no anonymous select policy is granted on purpose.

-- ---------------------------------------------------------------------------
-- Storage (logos)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "logos_read_owner" on storage.objects
  for select using (
    bucket_id = 'logos' and public.is_business_owner((storage.foldername(name))[1]::uuid)
  );

create policy "logos_write_owner" on storage.objects
  for insert with check (
    bucket_id = 'logos' and public.is_business_owner((storage.foldername(name))[1]::uuid)
  );

create policy "logos_update_owner" on storage.objects
  for update using (
    bucket_id = 'logos' and public.is_business_owner((storage.foldername(name))[1]::uuid)
  );

create policy "logos_delete_owner" on storage.objects
  for delete using (
    bucket_id = 'logos' and public.is_business_owner((storage.foldername(name))[1]::uuid)
  );
