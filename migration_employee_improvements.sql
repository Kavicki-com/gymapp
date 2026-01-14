-- Migration: Add additional fields to employees table and create employee_payments table
-- Run this migration in the Supabase SQL editor

-- =====================================================
-- 1. Add missing columns to employees table
-- =====================================================

-- Add CTPS column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'ctps'
    ) THEN
        ALTER TABLE public.employees ADD COLUMN ctps TEXT;
    END IF;
END $$;

-- Add admission_date column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'admission_date'
    ) THEN
        ALTER TABLE public.employees ADD COLUMN admission_date DATE;
    END IF;
END $$;

-- Add payment_day column (day of month for salary payment)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'payment_day'
    ) THEN
        ALTER TABLE public.employees ADD COLUMN payment_day INTEGER;
    END IF;
END $$;

-- Add photo_url column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'photo_url'
    ) THEN
        ALTER TABLE public.employees ADD COLUMN photo_url TEXT;
    END IF;
END $$;

-- =====================================================
-- 2. Create employee_payments table for salary history
-- =====================================================

CREATE TABLE IF NOT EXISTS public.employee_payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    gym_id UUID REFERENCES public.gym_profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on employee_payments
ALTER TABLE public.employee_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_payments
CREATE POLICY "Gym owners can view their own employee payments"
ON public.employee_payments FOR SELECT
USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Gym owners can insert their own employee payments"
ON public.employee_payments FOR INSERT
WITH CHECK (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Gym owners can update their own employee payments"
ON public.employee_payments FOR UPDATE
USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Gym owners can delete their own employee payments"
ON public.employee_payments FOR DELETE
USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = auth.uid()));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employee_payments_employee_id ON public.employee_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_payments_gym_id ON public.employee_payments(gym_id);

-- =====================================================
-- 3. Create storage bucket for employee photos
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-photos', 'employee-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for employee-photos bucket
CREATE POLICY "Public read access for employee photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'employee-photos');

CREATE POLICY "Authenticated users can upload employee photos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'employee-photos' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update employee photos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'employee-photos' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete employee photos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'employee-photos' 
    AND auth.role() = 'authenticated'
);
