-- Run after schema.sql in SQL Editor. Test fixtures are rolled back.
begin;
insert into auth.users (id, email) values
  ('fab10000-0000-4000-8000-000000000001', 'rls-admin-test@example.invalid'),
  ('fab10000-0000-4000-8000-000000000002', 'rls-student-test@example.invalid');
insert into public.admins values ('fab10000-0000-4000-8000-000000000001');
insert into public.modules (id, title, category, video_id, published) values
  ('fab20000-0000-4000-8000-000000000001', 'Permission test draft', '2026 O/L Maths', 'dQw4w9WgXcQ', false),
  ('fab20000-0000-4000-8000-000000000002', 'Permission test public', '2026 O/L Maths', 'dQw4w9WgXcQ', true);

set local role anon;
do $$ begin
  if (select count(*) from public.modules where id in ('fab20000-0000-4000-8000-000000000001', 'fab20000-0000-4000-8000-000000000002')) <> 1 then
    raise exception 'Anonymous draft visibility failure';
  end if;
  begin
    insert into public.modules(title, category, video_id) values ('Forbidden', '2026 O/L Maths', 'dQw4w9WgXcQ');
    raise exception 'Anonymous insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'fab10000-0000-4000-8000-000000000002', true);
do $$ declare affected integer; begin
  if exists(select 1 from public.modules where id = 'fab20000-0000-4000-8000-000000000001') then raise exception 'Student can see draft'; end if;
  update public.modules set title = 'Forbidden' where id = 'fab20000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Student can update module'; end if;
  delete from public.modules where id = 'fab20000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Student can delete module'; end if;
  begin
    insert into public.admins values ('fab10000-0000-4000-8000-000000000002');
    raise exception 'Student can self-promote';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.modules(title, category, video_id) values ('Forbidden', '2026 O/L Maths', 'dQw4w9WgXcQ');
    raise exception 'Student insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', 'fab10000-0000-4000-8000-000000000001', true);
do $$ declare affected integer; begin
  if not exists(select 1 from public.modules where id = 'fab20000-0000-4000-8000-000000000001') then raise exception 'Admin cannot read draft'; end if;
  update public.modules set published = true where id = 'fab20000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Admin cannot publish'; end if;
  delete from public.modules where id = 'fab20000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Admin cannot delete'; end if;
end $$;
reset role;
rollback;
