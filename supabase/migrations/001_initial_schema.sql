-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- captures
-- ─────────────────────────────────────────────────────────────
create table public.captures (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid references auth.users(id) on delete cascade not null,
  created_at            timestamptz default now() not null,

  -- What it is
  type                  text not null check (type in ('photo','voice','note','collection','rule','feeling','reaction')),
  content               text not null default '',
  verdict               text check (verdict in ('keep','reject')) default null,
  media_url             text default null,

  -- Organization (all optional at capture time)
  tags                  text[] not null default '{}',
  domains               text[] not null default '{}',
  rule_verb             text check (rule_verb in ('ALWAYS','NEVER','PREFER','AVOID')) default null,

  -- Context assignment
  context_ids           uuid[] not null default '{}',

  -- AI-assigned fields
  ai_tags               text[] not null default '{}',
  ai_domains            text[] not null default '{}',
  ai_suggested_contexts uuid[] not null default '{}',
  ai_processed          boolean not null default false
);

alter table public.captures enable row level security;

create policy "Users see own captures"
  on public.captures for select
  using (auth.uid() = user_id);

create policy "Users insert own captures"
  on public.captures for insert
  with check (auth.uid() = user_id);

create policy "Users update own captures"
  on public.captures for update
  using (auth.uid() = user_id);

create policy "Users delete own captures"
  on public.captures for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- contexts (brands and projects)
-- ─────────────────────────────────────────────────────────────
create table public.contexts (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references auth.users(id) on delete cascade not null,
  created_at          timestamptz default now() not null,

  type                text not null check (type in ('brand','project')),
  name                text not null,
  description         text not null default '',
  parent_context_id   uuid references public.contexts(id) on delete set null default null,
  cover_capture_id    uuid references public.captures(id) on delete set null default null,
  archived            boolean not null default false
);

alter table public.contexts enable row level security;

create policy "Users see own contexts"
  on public.contexts for select
  using (auth.uid() = user_id);

create policy "Users insert own contexts"
  on public.contexts for insert
  with check (auth.uid() = user_id);

create policy "Users update own contexts"
  on public.contexts for update
  using (auth.uid() = user_id);

create policy "Users delete own contexts"
  on public.contexts for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- capsules
-- ─────────────────────────────────────────────────────────────
create table public.capsules (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references auth.users(id) on delete cascade not null,
  context_id          uuid references public.contexts(id) on delete cascade default null,
  created_at          timestamptz default now() not null,

  version             text not null default 'v1.0',
  title               text not null default '',
  declaration         text not null default '',

  -- Distilled outputs (stored as JSONB)
  rules               jsonb not null default '[]',
  frequency_map       jsonb not null default '{}',

  exported_at         timestamptz default null,

  -- Taste Protocol
  protocol_version    text not null default '1',
  protocol_json_url   text default null
);

alter table public.capsules enable row level security;

create policy "Users see own capsules"
  on public.capsules for select
  using (auth.uid() = user_id);

create policy "Users insert own capsules"
  on public.capsules for insert
  with check (auth.uid() = user_id);

create policy "Users update own capsules"
  on public.capsules for update
  using (auth.uid() = user_id);

create policy "Users delete own capsules"
  on public.capsules for delete
  using (auth.uid() = user_id);

-- Public capsule read (for protocol endpoint and dossier sharing)
create policy "Public capsules are viewable by all"
  on public.capsules for select
  using (protocol_json_url is not null);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────
create index captures_user_id_idx    on public.captures(user_id);
create index captures_created_at_idx on public.captures(created_at desc);
create index captures_type_idx       on public.captures(type);
create index contexts_user_id_idx    on public.contexts(user_id);
create index capsules_context_id_idx on public.capsules(context_id);
