
-- 1) profile primary year
alter table public.profiles add column if not exists primary_year_id uuid references public.academic_years(id) on delete set null;

-- 2) seasons
create table public.leaderboard_seasons (
  id uuid primary key default gen_random_uuid(),
  year_id uuid not null references public.academic_years(id) on delete cascade,
  name text not null default 'Season 1',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index leaderboard_seasons_one_current on public.leaderboard_seasons(year_id) where is_current;
grant select on public.leaderboard_seasons to authenticated;
grant all on public.leaderboard_seasons to service_role;
alter table public.leaderboard_seasons enable row level security;
create policy seasons_read on public.leaderboard_seasons for select to authenticated using (true);
create policy seasons_admin_all on public.leaderboard_seasons for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 3) point ledger
create table public.point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year_id uuid not null references public.academic_years(id) on delete cascade,
  season_id uuid not null references public.leaderboard_seasons(id) on delete cascade,
  kind text not null,
  points integer not null,
  dedupe_key text not null,
  meta jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, season_id, dedupe_key)
);
create index point_events_user_idx on public.point_events(user_id, created_at desc);
grant select on public.point_events to authenticated;
grant all on public.point_events to service_role;
alter table public.point_events enable row level security;
create policy pe_self_read on public.point_events for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- 4) aggregate scores
create table public.leaderboard_scores (
  user_id uuid not null references auth.users(id) on delete cascade,
  year_id uuid not null references public.academic_years(id) on delete cascade,
  season_id uuid not null references public.leaderboard_seasons(id) on delete cascade,
  total_points integer not null default 0,
  correct_answers integer not null default 0,
  current_streak integer not null default 0,
  last_event_at timestamptz not null default now(),
  primary key (user_id, year_id, season_id)
);
create index leaderboard_scores_rank on public.leaderboard_scores(year_id, season_id, total_points desc, correct_answers desc, last_event_at desc);
grant select on public.leaderboard_scores to authenticated;
grant all on public.leaderboard_scores to service_role;
alter table public.leaderboard_scores enable row level security;
create policy ls_read on public.leaderboard_scores for select to authenticated using (true);

-- 5) study minutes
create table public.study_minutes (
  user_id uuid not null references auth.users(id) on delete cascade,
  year_id uuid not null references public.academic_years(id) on delete cascade,
  day date not null,
  minutes integer not null default 0,
  primary key (user_id, year_id, day)
);
grant select on public.study_minutes to authenticated;
grant all on public.study_minutes to service_role;
alter table public.study_minutes enable row level security;
create policy sm_self on public.study_minutes for select to authenticated using (user_id = auth.uid());

-- 6) realtime
alter publication supabase_realtime add table public.leaderboard_scores;

-- 7) ensure current season
create or replace function public.ensure_current_season(_year_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  select id into sid from public.leaderboard_seasons where year_id = _year_id and is_current = true limit 1;
  if sid is null then
    insert into public.leaderboard_seasons(year_id, name) values (_year_id, 'Season 1') returning id into sid;
  end if;
  return sid;
end $$;

-- 8) auto-create season when new year is added
create or replace function public._auto_season_on_year() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.leaderboard_seasons(year_id, name) values (new.id, 'Season 1');
  return new;
end $$;
drop trigger if exists trg_auto_season on public.academic_years;
create trigger trg_auto_season after insert on public.academic_years for each row execute function public._auto_season_on_year();

-- 9) backfill: create seasons for existing years
insert into public.leaderboard_seasons(year_id, name)
select y.id, 'Season 1' from public.academic_years y
where not exists (select 1 from public.leaderboard_seasons s where s.year_id = y.id);

-- 10) award points (internal use via other SD funcs)
create or replace function public.award_points(_user uuid, _year uuid, _kind text, _points int, _dedupe text, _meta jsonb default null, _increment_correct int default 0)
returns boolean language plpgsql security definer set search_path = public as $$
declare sid uuid; inserted_id uuid;
begin
  if _year is null or _user is null then return false; end if;
  sid := public.ensure_current_season(_year);
  insert into public.point_events(user_id, year_id, season_id, kind, points, dedupe_key, meta)
  values (_user, _year, sid, _kind, _points, _dedupe, _meta)
  on conflict (user_id, season_id, dedupe_key) do nothing
  returning id into inserted_id;
  if inserted_id is null then return false; end if;
  insert into public.leaderboard_scores(user_id, year_id, season_id, total_points, correct_answers, last_event_at)
  values (_user, _year, sid, _points, _increment_correct, now())
  on conflict (user_id, year_id, season_id) do update
    set total_points = public.leaderboard_scores.total_points + excluded.total_points,
        correct_answers = public.leaderboard_scores.correct_answers + excluded.correct_answers,
        last_event_at = now();
  return true;
end $$;

-- 11) rewrite bump_streak to award login + streak milestones
create or replace function public.bump_streak()
returns public.user_streaks
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  rec public.user_streaks;
  today date := current_date;
  yr uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  select primary_year_id into yr from public.profiles where id = uid;
  if yr is null then
    select id into yr from public.academic_years where deleted_at is null order by order_index limit 1;
    if yr is not null then update public.profiles set primary_year_id = yr where id = uid; end if;
  end if;

  select * into rec from public.user_streaks where user_id = uid;
  if not found then
    insert into public.user_streaks(user_id, current_streak, last_login_date) values (uid, 1, today) returning * into rec;
  elsif rec.last_login_date = today then
    null;
  elsif rec.last_login_date = today - interval '1 day' then
    update public.user_streaks set current_streak = current_streak + 1, last_login_date = today, updated_at = now() where user_id = uid returning * into rec;
  else
    update public.user_streaks set current_streak = 1, last_login_date = today, updated_at = now() where user_id = uid returning * into rec;
  end if;

  if yr is not null then
    perform public.award_points(uid, yr, 'daily_login', 5, 'daily:'||today::text);
    if rec.current_streak = 3 then
      perform public.award_points(uid, yr, 'streak_3', 20, 'streak3:'||today::text);
    end if;
    if rec.current_streak = 7 then
      perform public.award_points(uid, yr, 'streak_7', 60, 'streak7:'||today::text);
    end if;
    if rec.current_streak = 30 then
      perform public.award_points(uid, yr, 'streak_30', 300, 'streak30:'||today::text);
    end if;
    update public.leaderboard_scores set current_streak = rec.current_streak
      where user_id = uid and year_id = yr and season_id = public.ensure_current_season(yr);
  end if;

  return rec;
end $$;

-- 12) award quiz submit
create or replace function public.award_quiz_submit(_attempt_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  a public.exam_attempts%rowtype;
  yr uuid;
  ans record;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into a from public.exam_attempts where id = _attempt_id and user_id = uid;
  if not found then return; end if;

  select s.year_id into yr
  from public.exam_answers ea
  join public.questions q on q.id = ea.question_id
  join public.subjects sub on sub.id = q.subject_id
  join public.semesters s on s.id = sub.semester_id
  where ea.attempt_id = _attempt_id
  limit 1;
  if yr is null then
    select primary_year_id into yr from public.profiles where id = uid;
  end if;
  if yr is null then return; end if;

  for ans in
    select ea.id, ea.is_correct from public.exam_answers ea where ea.attempt_id = _attempt_id
  loop
    if ans.is_correct then
      perform public.award_points(uid, yr, 'answer_correct', 3, 'ans:'||ans.id::text, null, 1);
    end if;
  end loop;

  perform public.award_points(uid, yr, 'quiz_complete', 15, 'quiz:'||a.id::text);
  if a.total_questions > 0 and a.correct_count = a.total_questions then
    perform public.award_points(uid, yr, 'quiz_perfect', 20, 'perfect:'||a.id::text);
  end if;
end $$;

-- 13) study heartbeat
create or replace function public.record_study_heartbeat(_year uuid default null) returns integer
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  today date := current_date;
  mins integer;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if _year is null then
    select primary_year_id into _year from public.profiles where id = uid;
    if _year is null then
      select id into _year from public.academic_years where deleted_at is null order by order_index limit 1;
    end if;
    if _year is null then return 0; end if;
  end if;
  insert into public.study_minutes(user_id, year_id, day, minutes) values (uid, _year, today, 1)
    on conflict (user_id, year_id, day) do update set minutes = public.study_minutes.minutes + 1
    returning minutes into mins;
  if mins = 30 then
    perform public.award_points(uid, _year, 'study_30m', 10, 'study30:'||uid::text||':'||today::text);
  elsif mins = 60 then
    perform public.award_points(uid, _year, 'study_60m', 25, 'study60:'||uid::text||':'||today::text);
  end if;
  return mins;
end $$;

-- 14) leaderboard read
create or replace function public.get_leaderboard(_year uuid)
returns table(
  user_id uuid,
  full_name text,
  avatar_url text,
  total_points integer,
  correct_answers integer,
  current_streak integer,
  last_event_at timestamptz,
  rank bigint,
  is_me boolean
) language sql stable security definer set search_path = public as $$
  with cur as (select id from public.leaderboard_seasons where year_id = _year and is_current = true limit 1),
  ranked as (
    select ls.user_id, ls.total_points, ls.correct_answers, ls.current_streak, ls.last_event_at,
      rank() over (order by ls.total_points desc, ls.correct_answers desc, ls.last_event_at desc) as rnk
    from public.leaderboard_scores ls
    join cur on cur.id = ls.season_id
    where ls.year_id = _year
  )
  select r.user_id,
    coalesce(nullif(p.full_name, ''), split_part(coalesce(p.email,''), '@', 1), 'Student') as full_name,
    p.avatar_url,
    r.total_points, r.correct_answers, r.current_streak, r.last_event_at,
    r.rnk as rank,
    (r.user_id = auth.uid()) as is_me
  from ranked r
  left join public.profiles p on p.id = r.user_id
  where r.rnk <= 100 or r.user_id = auth.uid()
  order by r.rnk;
$$;

-- 15) admin reset (start new season)
create or replace function public.admin_reset_leaderboard(_year uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_name text; new_id uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.leaderboard_seasons set is_current = false, ended_at = now() where year_id = _year and is_current = true;
  select 'Season ' || (count(*) + 1)::text into new_name from public.leaderboard_seasons where year_id = _year;
  insert into public.leaderboard_seasons(year_id, name, is_current) values (_year, new_name, true) returning id into new_id;
  return new_id;
end $$;
