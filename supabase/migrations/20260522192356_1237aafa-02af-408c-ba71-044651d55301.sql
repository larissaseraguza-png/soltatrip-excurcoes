
-- Passageiros
create table public.passageiros (
  id uuid primary key default gen_random_uuid(),
  excursao_id uuid not null references public.excursoes(id) on delete cascade,
  nome text not null,
  telefone text,
  documento text,
  assento text,
  status text not null default 'pendente', -- pendente, confirmado, embarcado, cancelado
  qr_code text not null unique default encode(gen_random_bytes(12), 'hex'),
  embarcado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index passageiros_excursao_idx on public.passageiros(excursao_id);

alter table public.passageiros enable row level security;

create policy "Organizers view passageiros"
  on public.passageiros for select
  using (exists (select 1 from public.excursoes e where e.id = excursao_id and e.organizer_id = auth.uid()));

create policy "Organizers insert passageiros"
  on public.passageiros for insert
  with check (exists (select 1 from public.excursoes e where e.id = excursao_id and e.organizer_id = auth.uid()));

create policy "Organizers update passageiros"
  on public.passageiros for update
  using (exists (select 1 from public.excursoes e where e.id = excursao_id and e.organizer_id = auth.uid()));

create policy "Organizers delete passageiros"
  on public.passageiros for delete
  using (exists (select 1 from public.excursoes e where e.id = excursao_id and e.organizer_id = auth.uid()));

create trigger passageiros_touch_updated_at
  before update on public.passageiros
  for each row execute function public.touch_updated_at();

-- Pagamentos
create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  passageiro_id uuid not null references public.passageiros(id) on delete cascade,
  excursao_id uuid not null references public.excursoes(id) on delete cascade,
  valor numeric not null default 0,
  metodo text not null default 'pix', -- pix, dinheiro, cartao, transferencia
  status text not null default 'pendente', -- pendente, pago, estornado
  comprovante_url text,
  observacao text,
  pago_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pagamentos_passageiro_idx on public.pagamentos(passageiro_id);
create index pagamentos_excursao_idx on public.pagamentos(excursao_id);

alter table public.pagamentos enable row level security;

create policy "Organizers view pagamentos"
  on public.pagamentos for select
  using (exists (select 1 from public.excursoes e where e.id = excursao_id and e.organizer_id = auth.uid()));

create policy "Organizers insert pagamentos"
  on public.pagamentos for insert
  with check (exists (select 1 from public.excursoes e where e.id = excursao_id and e.organizer_id = auth.uid()));

create policy "Organizers update pagamentos"
  on public.pagamentos for update
  using (exists (select 1 from public.excursoes e where e.id = excursao_id and e.organizer_id = auth.uid()));

create policy "Organizers delete pagamentos"
  on public.pagamentos for delete
  using (exists (select 1 from public.excursoes e where e.id = excursao_id and e.organizer_id = auth.uid()));

create trigger pagamentos_touch_updated_at
  before update on public.pagamentos
  for each row execute function public.touch_updated_at();
