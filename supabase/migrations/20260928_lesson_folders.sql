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
