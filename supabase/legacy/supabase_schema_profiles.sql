-- Gym Profiles Table
CREATE TABLE IF NOT EXISTS public.gym_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    gym_name TEXT NOT NULL,
    logo_url TEXT,
    address TEXT,
    opening_hours TEXT,
    cnpj TEXT,
    owner_cpf TEXT,
    owner_birth_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Gym Profiles
ALTER TABLE public.gym_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own profile" 
ON public.gym_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own profile" 
ON public.gym_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.gym_profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Storage Bucket for Logos (Check existence first in real usage, but SQL script typically runs once)
-- Note: 'storage.buckets' insert might fail if it already exists or if via SQL editor permissions are different.
-- Ideally run this via Supabase Dashboard -> Storage if SQL fails.
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Note: These might need to be adjusted if storage policies are strictly managed.
CREATE POLICY "Logos are publicly accessible" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'logos' );

CREATE POLICY "Users can upload logos" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'logos' AND auth.uid() = owner );
