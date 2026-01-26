-- Query para criar usuário Tester, identidade e perfil de academia
-- Execute isso no SQL Editor do Supabase

BEGIN;

WITH new_user AS (
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000',
        extensions.uuid_generate_v4(),
        'authenticated',
        'authenticated',
        'tester@kavicki.com',
        crypt('T35t3r#$', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Apple Gym"}',
        FALSE,
        NOW(),
        NOW()
    )
    RETURNING id, email
),
new_identity AS (
    INSERT INTO auth.identities (
        id,
        provider_id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    )
    SELECT
        extensions.uuid_generate_v4(),
        id::text,
        id,
        jsonb_build_object('sub', id, 'email', email),
        'email',
        NOW(),
        NOW(),
        NOW()
    FROM new_user
)
INSERT INTO public.gym_profiles (
    user_id,
    gym_name,
    address,
    cnpj,
    opening_hours,
    created_at,
    updated_at
)
SELECT
    id,
    'Apple Gym',
    '1 Apple Park Way, Cupertino, CA 95014',
    '38.375.021/0001-34', -- CNPJ fictício válido para teste
    'Seg-Sex: 06:00 - 22:00',
    NOW(),
    NOW()
FROM new_user;

COMMIT;
