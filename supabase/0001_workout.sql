-- Workout Tracker: where the synced data lives.
--
-- Run once in Cameron's Supabase project (SQL editor). Then add `workout` to
-- Settings -> API -> Exposed schemas, or the app cannot see it.
--
-- Everything sits in its own schema, `workout`, so nothing here can touch
-- Cameron's tables. Safe to run twice.

create schema if not exists workout;

-- One row per data blob per person: workoutData, completionData,
-- workoutHistory, appSettings, splitHistory. `version` goes up by one on every
-- upload. The app says "replace version 7"; if the row is already on 8, another
-- device got there first and the upload changes nothing (see sync.js).
create table if not exists workout.state (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  key        text        not null check (key in
               ('workoutData', 'completionData', 'workoutHistory', 'appSettings', 'splitHistory')),
  value      jsonb       not null,
  version    integer     not null check (version >= 1),
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Every copy that gets replaced is kept here for 60 days. This is the undo:
-- if a device ever uploads something wrong, the copy before it is still here.
create table if not exists workout.state_history (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  key         text        not null,
  value       jsonb       not null,
  version     integer     not null,
  replaced_at timestamptz not null default now()
);
create index if not exists state_history_lookup
  on workout.state_history (user_id, key, replaced_at desc);

create or replace function workout.keep_history() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.value is distinct from old.value then
    insert into workout.state_history (user_id, key, value, version)
    values (old.user_id, old.key, old.value, old.version);
    delete from workout.state_history
     where user_id = old.user_id and key = old.key
       and replaced_at < now() - interval '60 days';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists keep_history on workout.state;
create trigger keep_history before update on workout.state
  for each row execute function workout.keep_history();

-- Row-level security: the database hands a row only to the person it belongs
-- to. This is the lock. The key in sync.js is public and opens nothing alone.
alter table workout.state         enable row level security;
alter table workout.state_history enable row level security;

drop policy if exists "own rows: read"   on workout.state;
drop policy if exists "own rows: create" on workout.state;
drop policy if exists "own rows: change" on workout.state;
create policy "own rows: read"   on workout.state for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own rows: create" on workout.state for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own rows: change" on workout.state for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- No delete policy on purpose: the app never deletes a blob.

drop policy if exists "own history: read" on workout.state_history;
create policy "own history: read" on workout.state_history for select to authenticated
  using (user_id = (select auth.uid()));

-- Signed-in users only. Visitors without a sign-in get nothing at all.
revoke all on schema workout from anon, public;
grant usage on schema workout to authenticated;
revoke all on all tables in schema workout from anon, public;
grant select, insert, update on workout.state to authenticated;
grant select on workout.state_history to authenticated;
revoke all on function workout.keep_history() from anon, authenticated, public;
