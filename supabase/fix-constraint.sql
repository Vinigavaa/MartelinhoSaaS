-- Script para corrigir a restrição NOT NULL na coluna repaired_part

-- Modificar a coluna repaired_part para permitir valores nulos
ALTER TABLE public.services 
ALTER COLUMN repaired_part DROP NOT NULL;

-- Atualizar o cache do Postgrest (API do Supabase)
NOTIFY pgrst, 'reload schema'; 