-- Script simples para adicionar a coluna repaired_parts e corrigir o problema

-- Adicionar a coluna repaired_parts se ela não existir
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS repaired_parts TEXT[] DEFAULT '{}';

-- Migrar dados da coluna antiga para a nova (só executa se repaired_part existir)
UPDATE public.services 
SET repaired_parts = ARRAY[repaired_part] 
WHERE repaired_part IS NOT NULL AND (repaired_parts IS NULL OR repaired_parts = '{}');

-- Atualizar o cache do Postgrest (API do Supabase)
NOTIFY pgrst, 'reload schema'; 