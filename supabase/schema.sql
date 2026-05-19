create table if not exists public.app_state (
  id bigint primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_state_updated_at on public.app_state;

create trigger trg_app_state_updated_at
before update on public.app_state
for each row
execute function public.set_updated_at();

insert into public.app_state (id, data)
values (1, '{}'::jsonb)
on conflict (id) do nothing;
