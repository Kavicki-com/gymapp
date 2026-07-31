-- Migration: Add gym_id to all tables for multi-tenant support
-- This enables data isolation between different gyms

-- Add gym_id column to plans table
ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gym_profiles(id) ON DELETE CASCADE;

-- Add gym_id column to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gym_profiles(id) ON DELETE CASCADE;

-- Add gym_id column to equipment table
ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gym_profiles(id) ON DELETE CASCADE;

-- Add gym_id column to employees table
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gym_profiles(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_plans_gym_id ON public.plans(gym_id);
CREATE INDEX IF NOT EXISTS idx_clients_gym_id ON public.clients(gym_id);
CREATE INDEX IF NOT EXISTS idx_equipment_gym_id ON public.equipment(gym_id);
CREATE INDEX IF NOT EXISTS idx_employees_gym_id ON public.employees(gym_id);

-- Drop old public access policies
DROP POLICY IF EXISTS "Public access for plans" ON public.plans;
DROP POLICY IF EXISTS "Public access for clients" ON public.clients;
DROP POLICY IF EXISTS "Public access for equipment" ON public.equipment;
DROP POLICY IF EXISTS "Public access for employees" ON public.employees;

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
