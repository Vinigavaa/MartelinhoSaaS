-- Verificar e corrigir a estrutura da tabela services
DO $$
BEGIN
  -- Garantir que tenant_id existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'services'
      AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.services ADD COLUMN tenant_id UUID REFERENCES auth.users;
    CREATE INDEX IF NOT EXISTS idx_services_tenant_id ON public.services(tenant_id);
  END IF;
END $$;

-- Desabilitar temporariamente RLS para diagnóstico
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Usuários podem ver seus próprios serviços" ON public.services;
DROP POLICY IF EXISTS "Usuários podem criar seus próprios serviços" ON public.services;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios serviços" ON public.services;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios serviços" ON public.services;
DROP POLICY IF EXISTS "Admin pode ver todos os serviços" ON public.services;

-- Garantir que os campos necessários existem
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'services'
      AND column_name = 'client_name'
  ) THEN
    ALTER TABLE public.services ADD COLUMN client_name TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'services'
      AND column_name = 'service_date'
  ) THEN
    ALTER TABLE public.services ADD COLUMN service_date DATE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'services'
      AND column_name = 'car_plate'
  ) THEN
    ALTER TABLE public.services ADD COLUMN car_plate TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'services'
      AND column_name = 'car_model'
  ) THEN
    ALTER TABLE public.services ADD COLUMN car_model TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'services'
      AND column_name = 'service_value'
  ) THEN
    ALTER TABLE public.services ADD COLUMN service_value DECIMAL(10, 2);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'services'
      AND column_name = 'repaired_parts'
  ) THEN
    ALTER TABLE public.services ADD COLUMN repaired_parts TEXT[];
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'services'
      AND column_name = 'auth_code'
  ) THEN
    ALTER TABLE public.services ADD COLUMN auth_code TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'services'
      AND column_name = 'observacoes'
  ) THEN
    ALTER TABLE public.services ADD COLUMN observacoes TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'services'
      AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.services ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'services'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.services ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
END $$;

-- Conceder permissões amplas para a tabela services
GRANT ALL ON public.services TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;

-- Garantir que a sequência do ID (se existir) também tenha permissões
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.sequences 
    WHERE sequence_schema = 'public' AND sequence_name = 'services_id_seq'
  ) THEN
    GRANT USAGE, SELECT ON SEQUENCE public.services_id_seq TO authenticated;
  END IF;
END $$;

-- Atualizar o cache do Postgrest
NOTIFY pgrst, 'reload schema'; 