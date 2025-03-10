-- Script completo para migração do banco de dados

-- 1. Remover a restrição NOT NULL da coluna repaired_part
ALTER TABLE public.services 
ALTER COLUMN repaired_part DROP NOT NULL;

-- 2. Garantir que a coluna repaired_parts exista
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS repaired_parts TEXT[] DEFAULT '{}';

-- 3. Migrar dados da coluna antiga para a nova (só executa se necessário)
UPDATE public.services 
SET repaired_parts = ARRAY[repaired_part] 
WHERE repaired_part IS NOT NULL AND (repaired_parts IS NULL OR repaired_parts = '{}');

-- 4. Criar uma trigger para manter a coluna antiga sincronizada com a nova
CREATE OR REPLACE FUNCTION sync_repaired_part() RETURNS TRIGGER AS $$
BEGIN
  -- Se repaired_parts tem pelo menos um elemento, use o primeiro para repaired_part
  IF array_length(NEW.repaired_parts, 1) > 0 THEN
    NEW.repaired_part = NEW.repaired_parts[1];
  ELSE
    NEW.repaired_part = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover a trigger se ela já existir
DROP TRIGGER IF EXISTS sync_repaired_part_trigger ON public.services;

-- Criar a trigger
CREATE TRIGGER sync_repaired_part_trigger
BEFORE INSERT OR UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION sync_repaired_part();

-- 5. Atualizar o cache do Postgrest (API do Supabase)
NOTIFY pgrst, 'reload schema'; 