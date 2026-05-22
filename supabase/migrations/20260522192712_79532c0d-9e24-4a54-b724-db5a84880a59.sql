
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  excursao_id uuid not null references public.excursoes(id) on delete cascade,
  passageiro_id uuid not null references public.passageiros(id) on delete cascade,
  feito_por uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index checkins_excursao_idx on public.checkins(excursao_id);

alter table public.checkins enable row level security;

create policy "Organizers view checkins"
  on public.checkins for select
  using (exists (select 1 from public.excursoes e where e.id = excursao_id and e.organizer_id = auth.uid()));

create policy "Organizers insert checkins"
  on public.checkins for insert
  with check (exists (select 1 from public.excursoes e where e.id = excursao_id and e.organizer_id = auth.uid()));

create table public.mensagens (
  id uuid primary key default gen_random_uuid(),
  excursao_id uuid not null references public.excursoes(id) on delete cascade,
  autor_id uuid not null references auth.users(id) on delete cascade,
  autor_nome text,
  conteudo text not null,
  created_at timestamptz not null default now()
);
create index mensagens_excursao_idx on public.mensagens(excursao_id, created_at);

alter table public.mensagens enable row level security;

create policy "Organizers view mensagens"
  on public.mensagens for select
  using (exists (select 1 from public.excursoes e where e.id = excursao_id and e.organizer_id = auth.uid()));

create policy "Organizers insert mensagens"
  on public.mensagens for insert
  with check (
    autor_id = auth.uid() and
    exists (select 1 from public.excursoes e where e.id = excursao_id and e.organizer_id = auth.uid())
  );

alter publication supabase_realtime add table public.mensagens;
