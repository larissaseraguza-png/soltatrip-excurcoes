
-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at helper
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- EXCURSOES
create table public.excursoes (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  destino text not null,
  descricao text,
  data_evento date not null,
  horario_saida text,
  horario_retorno text,
  ponto_embarque text,
  preco numeric(10,2) not null default 0,
  total_vagas integer not null default 0,
  status text not null default 'rascunho',
  cor text default '#a855f7',
  banner_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.excursoes enable row level security;

create policy "Organizers view their excursoes"
  on public.excursoes for select
  using (auth.uid() = organizer_id);

create policy "Organizers create excursoes"
  on public.excursoes for insert
  with check (auth.uid() = organizer_id);

create policy "Organizers update their excursoes"
  on public.excursoes for update
  using (auth.uid() = organizer_id);

create policy "Organizers delete their excursoes"
  on public.excursoes for delete
  using (auth.uid() = organizer_id);

create trigger excursoes_touch_updated
  before update on public.excursoes
  for each row execute function public.touch_updated_at();

create index excursoes_organizer_idx on public.excursoes(organizer_id);
create index excursoes_data_idx on public.excursoes(data_evento);
