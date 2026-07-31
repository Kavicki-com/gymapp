-- Migration: Add gym_id to all tables for multi-tenant support (Version 2 - Idempotent)
-- This enables data isolation between different gyms
-- This version is safe to run multiple times

-- Add gym_id column to plans table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'plans' AND column_name = 'gym_id'
    ) THEN
        ALTER TABLE public.plans ADD COLUMN gym_id UUID REFERENCES public.gym_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add gym_id column to clients table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'gym_id'
    ) THEN
        ALTER TABLE public.clients ADD COLUMN gym_id UUID REFERENCES public.gym_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add gym_id column to equipment table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'equipment' AND column_name = 'gym_id'
    ) THEN
        ALTER TABLE public.equipment ADD COLUMN gym_id UUID REFERENCES public.gym_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add gym_id column to employees table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'gym_id'
    ) THEN
        ALTER TABLE public.employees ADD COLUMN gym_id UUID REFERENCES public.gym_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_plans_gym_id ON public.plans(gym_id);
CREATE INDEX IF NOT EXISTS idx_clients_gym_id ON public.clients(gym_id);
CREATE INDEX IF NOT EXISTS idx_equipment_gym_id ON public.equipment(gym_id);
CREATE INDEX IF NOT EXISTS idx_employees_gym_id ON public.employees(gym_id);

-- Drop ALL existing policies first (using CASCADE to be safe)
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies for plans
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'plans' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.plans CASCADE';
    END LOOP;
    
    -- Drop all policies for clients
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'clients' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.clients CASCADE';
    END LOOP;
    
    -- Drop all policies for equipment
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'equipment' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.equipment CASCADE';
    END LOOP;
    
    -- Drop all policies for employees
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'employees' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.employees CASCADE';
    END LOOP;
END $$;

-- Create new RLS policies for gym-based access
-- Plans policies
CREATE POLICY "Gym owners can view their own plans"
ON public.plans FOR SELECT
USING (
    gym_id IN (
        SELECT id FROM public.gym_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Gym owners can insert their own plans"
ON public.plans FOR INSERT
WITH CHECK (
    gym_id IN (
        SELECT id FROM public.gym_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Gym owners can update their own plans"
ON public.plans FOR UPDATE
USING (
    gym_id IN (
        SELECT id FROM public.gym_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Gym owners can delete their own plans"
ON public.plans FOR DELETE
USING (
    gym_id IN (
        SELECT id FROM public.gym_profiles WHERE user_id = auth.uid()
    )
);

-- Clients policies
CREATE POLICY "Gym owners can view their own clients"
ON public.clients FOR SELECT
USING (
    gym_id IN (
        SELECT id FROM public.gym_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Gym owners can insert their own clients"
ON public.clients FOR INSERT
WITH CHECK (
    gym_id IN (
        SELECT id FROM public.gym_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Gym owners can update their own clients"
ON public.clients FOR UPDATE
USING (
    gym_id IN (
        SELECT id FROM public.gym_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Gym owners can delete their own clients"
ON public.clients FOR DELETE
USING (
    gym_id IN (
        SELECT id FROM public.gym_profiles WHERE user_id = auth.uid()
    )
);

-- Equipment policies
CREATE POLICY "Gym owners can view their own equipment"
ON public.equipment FOR SELECT
USING (
    gym_id IN (
        SELECT id FROM public.gym_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Gym owners can insert their own equipment"
ON public.equipment FOR INSERT
WITH CHECK (
    gym_id IN (
        SELECT id FROM public.gym_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Gym owners can update their own equipment"
ON public.equipment FOR UPDATE
USING (
    gym_id IN (
        SELECT id FROM public.gym_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Gym owners can delete their own equipment"
ON public.equipment FOR DELETE
USING (
    gym_id IN (
        SELECT id FROM public.gym_profiles WHERE user_id = auth.uid()
    )
);

-- Employees policies
CREATE POLICY "Gym owners can view their own employees"
ON public.employees FOR SELECT
USING (
    gym_id IN (
        SELECT id FROM public.gym_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Gym owners can insert their own employees"
ON public.employees FOR INSERT
WITH CHECK (
    gym_id IN (
        SELECT id FROM public.gym_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Gym owners can update their own employees"
ON public.employees FOR UPDATE
USING (
    gym_id IN (
        SELECT id FROM public.gym_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Gym owners can delete their own employees"
ON public.employees FOR DELETE
USING (
    gym_id IN (
        SELECT id FROM public.gym_profiles WHERE user_id = auth.uid()
    )
);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully! All tables now have gym_id column and proper RLS policies.';
END $$;
