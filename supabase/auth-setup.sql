-- Habilitar extensões
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Criar tabela de perfis
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  company_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Adicionar tenant_id à tabela de serviços (se já não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'services'
      AND column_name = 'tenant_id'
  ) THEN
    -- Primeiro adicionar como nullable
    ALTER TABLE public.services 
    ADD COLUMN tenant_id UUID REFERENCES auth.users;
    
    -- Criar um índice para melhor performance
    CREATE INDEX IF NOT EXISTS idx_services_tenant_id ON public.services(tenant_id);
  END IF;
END $$;

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Usuários podem ver seus próprios perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios serviços" ON public.services;
DROP POLICY IF EXISTS "Usuários podem criar seus próprios serviços" ON public.services;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios serviços" ON public.services;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios serviços" ON public.services;
DROP POLICY IF EXISTS "Admin pode ver todos os serviços" ON public.services;
DROP POLICY IF EXISTS "Acesso anônimo para perfis" ON public.profiles;

-- Criar políticas para tabela de perfis
CREATE POLICY "Usuários podem ver seus próprios perfis"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seus próprios perfis"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Permitir acesso anônimo para leitura (opcional, se necessário para páginas públicas)
CREATE POLICY "Acesso anônimo para perfis"
  ON public.profiles FOR SELECT
  USING (true);

-- Criar políticas para tabela de serviços
CREATE POLICY "Usuários podem ver seus próprios serviços"
  ON public.services FOR SELECT
  USING (tenant_id IS NULL OR auth.uid() = tenant_id);

CREATE POLICY "Usuários podem criar seus próprios serviços"
  ON public.services FOR INSERT
  WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Usuários podem atualizar seus próprios serviços"
  ON public.services FOR UPDATE
  USING (auth.uid() = tenant_id);

CREATE POLICY "Usuários podem deletar seus próprios serviços"
  ON public.services FOR DELETE
  USING (auth.uid() = tenant_id);

-- Função para criar automaticamente um perfil ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, company_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criação automática de perfil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Definir tenant_id para serviços existentes (se necessário)
DO $$
DECLARE
  first_user_id UUID;
BEGIN
  -- Obter o ID do primeiro usuário (se existir)
  SELECT id INTO first_user_id FROM auth.users LIMIT 1;
  
  -- Se existir algum usuário, atualizar serviços sem tenant_id
  IF first_user_id IS NOT NULL THEN
    UPDATE public.services
    SET tenant_id = first_user_id
    WHERE tenant_id IS NULL;
    
    -- Depois da migração, tornar o tenant_id NOT NULL
    ALTER TABLE public.services 
    ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

-- Atualizar o cache do Postgrest
NOTIFY pgrst, 'reload schema'; 