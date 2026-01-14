-- Remove duplicate profiles keeping the most recent one
DELETE FROM public.gym_profiles
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as r_num
    FROM public.gym_profiles
  ) t
  WHERE t.r_num > 1
);

-- Add unique constraint to user_id to prevent duplicates
BEGIN;
ALTER TABLE public.gym_profiles DROP CONSTRAINT IF EXISTS gym_profiles_user_id_key;
ALTER TABLE public.gym_profiles ADD CONSTRAINT gym_profiles_user_id_key UNIQUE (user_id);
COMMIT;

-- Ensure storage bucket exists and is public
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT (id) DO NOTHING;

-- Ensure RLS policies for storage allow public read
DROP POLICY IF EXISTS "Logos are publicly accessible" ON storage.objects;
CREATE POLICY "Logos are publicly accessible" ON storage.objects FOR SELECT USING ( bucket_id = 'logos' );

DROP POLICY IF EXISTS "Users can upload logos" ON storage.objects;
CREATE POLICY "Users can upload logos" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'logos' AND auth.uid() = owner );

DROP POLICY IF EXISTS "Users can update logos" ON storage.objects;
CREATE POLICY "Users can update logos" ON storage.objects FOR UPDATE USING ( bucket_id = 'logos' AND auth.uid() = owner );
