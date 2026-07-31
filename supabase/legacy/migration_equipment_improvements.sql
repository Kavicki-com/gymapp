-- Migration: Equipment Improvements
-- Creates tables for equipment images and maintenance history

-- Equipment Images Table
CREATE TABLE IF NOT EXISTS public.equipment_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    gym_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment Maintenances Table (History)
CREATE TABLE IF NOT EXISTS public.equipment_maintenances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    maintenance_date DATE NOT NULL,
    observations TEXT,
    gym_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.equipment_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_maintenances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for equipment_images
CREATE POLICY "Users can view own equipment images"
    ON public.equipment_images FOR SELECT
    USING (gym_id = auth.uid());

CREATE POLICY "Users can insert own equipment images"
    ON public.equipment_images FOR INSERT
    WITH CHECK (gym_id = auth.uid());

CREATE POLICY "Users can delete own equipment images"
    ON public.equipment_images FOR DELETE
    USING (gym_id = auth.uid());

-- RLS Policies for equipment_maintenances
CREATE POLICY "Users can view own equipment maintenances"
    ON public.equipment_maintenances FOR SELECT
    USING (gym_id = auth.uid());

CREATE POLICY "Users can insert own equipment maintenances"
    ON public.equipment_maintenances FOR INSERT
    WITH CHECK (gym_id = auth.uid());

CREATE POLICY "Users can update own equipment maintenances"
    ON public.equipment_maintenances FOR UPDATE
    USING (gym_id = auth.uid());

CREATE POLICY "Users can delete own equipment maintenances"
    ON public.equipment_maintenances FOR DELETE
    USING (gym_id = auth.uid());

-- Storage bucket for equipment images
INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment-images', 'equipment-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for equipment-images bucket
CREATE POLICY "Anyone can view equipment images"
ON storage.objects FOR SELECT
USING (bucket_id = 'equipment-images');

CREATE POLICY "Authenticated users can upload equipment images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'equipment-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own equipment images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'equipment-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own equipment images"
ON storage.objects FOR DELETE
USING (bucket_id = 'equipment-images' AND auth.uid()::text = (storage.foldername(name))[1]);
