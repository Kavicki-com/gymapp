ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS serial_number TEXT;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS acquisition_date DATE;
