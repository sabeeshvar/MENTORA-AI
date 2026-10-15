-- =============================================================================
-- MENTORA AI — Auth User Created Trigger Migration
-- Automatically creates public.profiles row on auth.users INSERT
-- Ensures Google OAuth and Email Signup users always have an initialized profile.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_name TEXT;
BEGIN
  -- Extract name from metadata or fallback to email local-part
  v_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1),
    'Student Learner'
  );

  INSERT INTO public.profiles (
    id,
    email,
    name,
    display_name,
    photo_url,
    role,
    preferred_language,
    fallback_language,
    locale,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    COALESCE(new.email, ''),
    v_name,
    v_name,
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    COALESCE(new.raw_user_meta_data->>'preferred_language', 'en'),
    'en',
    'en-US',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(public.profiles.name, EXCLUDED.name),
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
    photo_url = COALESCE(EXCLUDED.photo_url, public.profiles.photo_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
