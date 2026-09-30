-- Run once in the Supabase SQL Editor for a new project.
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;
create policy "Admins can check their own membership" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 200),
  description text not null default '' check (length(description) <= 5000),
  category text not null check (category in ('2026 O/L Maths', 'AL Video Modules', 'GIT', 'O/L Courses', 'Tutes', 'A/L Past Papers', 'O/L Past Papers')),
  video_id text not null check (video_id ~ '^[a-zA-Z0-9_-]{11}$'),
  published boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.modules enable row level security;
revoke all on public.modules from anon, authenticated;
grant select on public.modules to anon, authenticated;
grant insert, update, delete on public.modules to authenticated;
create policy "Visitors can read published lessons" on public.modules
  for select to anon, authenticated using (published = true);
create policy "Administrators manage lessons" on public.modules
  for all to authenticated
  using (exists (select 1 from public.admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.admins where user_id = (select auth.uid())));
create index modules_public_category on public.modules(category, created_at desc) where published = true;

-- Create your account in Authentication > Users first, then run separately:
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'YOUR_ADMIN_EMAIL';
-- Existing projects: run once in Supabase SQL Editor.
begin;
create table public.lesson_folders (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 200),
  description text not null check (length(trim(description)) between 1 and 5000),
  category text not null check (category in ('2026 O/L Maths', 'AL Video Modules', 'GIT', 'O/L Courses', 'Tutes', 'A/L Past Papers', 'O/L Past Papers')),
  planned_videos integer not null check (planned_videos between 1 and 10000),
  marks integer not null check (marks between 0 and 1000),
  created_at timestamptz not null default now(),
  unique (id, category)
);
alter table public.lesson_folders enable row level security;
revoke all on public.lesson_folders from anon, authenticated;
grant select on public.lesson_folders to anon, authenticated;
grant insert, update on public.lesson_folders to authenticated;
create policy "Visitors read lesson folders" on public.lesson_folders
  for select to anon, authenticated using (true);
create policy "Administrators create lesson folders" on public.lesson_folders
  for insert to authenticated with check (exists (select 1 from public.admins where user_id = (select auth.uid())));
create policy "Administrators update lesson folders" on public.lesson_folders
  for update to authenticated
  using (exists (select 1 from public.admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.admins where user_id = (select auth.uid())));
alter table public.modules add column folder_id uuid;
alter table public.modules add constraint modules_lesson_folder_fk
  foreign key (folder_id, category) references public.lesson_folders(id, category) on delete restrict;
create index modules_folder_id on public.modules(folder_id);
commit;
