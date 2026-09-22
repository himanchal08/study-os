-- Update the handle_new_user trigger to also seed the default syllabus
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    )
  )
  on conflict (user_id) do nothing;

  -- Seed default syllabus for the new user by cloning himanchalkhattri@gmail.com
  perform public.seed_user_canonical_syllabus(new.id);

  return new;

exception
  when others then
    -- Log but never block user creation
    raise warning 'handle_new_user: profile insert or syllabus seed failed for user %: % (%)',
      new.id, sqlerrm, sqlstate;
    return new;
end;
$$;
