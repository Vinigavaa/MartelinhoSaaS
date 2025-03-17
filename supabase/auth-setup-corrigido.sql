-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ************************
-- ETAPA 1: CRIAR TABELAS
-- ************************

-- Criar tabela de perfis primeiro
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  company_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Verificar se a tabela foi criada
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    RAISE EXCEPTION 'Tabela profiles não foi criada corretamente';
  END IF;
END $$;

-- ************************
-- ETAPA 2: ADICIONAR TENANT_ID
-- ************************

-- Adicionar tenant_id à tabela de serviços (se já não existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'services'
  ) AND NOT EXISTS (
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

-- ************************
-- ETAPA 3: CONFIGURAR RLS
-- ************************

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Se a tabela services existir, habilitar RLS nela também
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'services'
  ) THEN
    ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ************************
-- ETAPA 4: CONFIGURAR POLÍTICAS
-- ************************

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Usuários podem ver seus próprios perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios perfis" ON public.profiles;
DROP POLICY IF EXISTS "Acesso anônimo para perfis" ON public.profiles;
DROP POLICY IF EXISTS "Função de sistema pode criar perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios perfis" ON public.profiles;

-- Criar políticas para tabela de perfis
CREATE POLICY "Usuários podem ver seus próprios perfis"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seus próprios perfis"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Acesso anônimo para perfis"
  ON public.profiles FOR SELECT
  USING (true);

-- Permitir que qualquer pessoa insira perfis (importante para o registro)
CREATE POLICY "Usuários podem inserir seus próprios perfis"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- Criar políticas para tabela de serviços (se existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'services'
  ) THEN
    -- Remover políticas existentes
    DROP POLICY IF EXISTS "Usuários podem ver seus próprios serviços" ON public.services;
    DROP POLICY IF EXISTS "Usuários podem criar seus próprios serviços" ON public.services;
    DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios serviços" ON public.services;
    DROP POLICY IF EXISTS "Usuários podem deletar seus próprios serviços" ON public.services;
    DROP POLICY IF EXISTS "Admin pode ver todos os serviços" ON public.services;
    
    -- Criar políticas
    EXECUTE 'CREATE POLICY "Usuários podem ver seus próprios serviços" ON public.services FOR SELECT USING (tenant_id IS NULL OR auth.uid() = tenant_id)';
    EXECUTE 'CREATE POLICY "Usuários podem criar seus próprios serviços" ON public.services FOR INSERT WITH CHECK (auth.uid() = tenant_id)';
    EXECUTE 'CREATE POLICY "Usuários podem atualizar seus próprios serviços" ON public.services FOR UPDATE USING (auth.uid() = tenant_id)';
    EXECUTE 'CREATE POLICY "Usuários podem deletar seus próprios serviços" ON public.services FOR DELETE USING (auth.uid() = tenant_id)';
  END IF;
END $$;

-- ************************
-- ETAPA 5: CONFIGURAR TRIGGER
-- ************************

-- Função para criar automaticamente um perfil ao registrar
-- Importante: Usar SECURITY DEFINER permite que a função ignore as políticas RLS
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

-- ************************
-- ETAPA 6: DEFINIR TENANT_ID PARA SERVIÇOS EXISTENTES
-- ************************

-- Atualizar serviços existentes (se necessário)
DO $$
DECLARE
  first_user_id UUID;
BEGIN
  -- Verificar se a tabela services existe
  IF EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'services'
  ) THEN
    -- Obter o ID do primeiro usuário (se existir)
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;
    
    -- Se existir algum usuário, atualizar serviços sem tenant_id
    IF first_user_id IS NOT NULL THEN
      UPDATE public.services
      SET tenant_id = first_user_id
      WHERE tenant_id IS NULL;
      
      -- Depois da migração, tornar o tenant_id NOT NULL apenas se tiver pelo menos um usuário
      ALTER TABLE public.services 
      ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- ************************
-- ETAPA 7: PERMITIR QUE A FUNÇÃO VEJA OUTROS DADOS
-- ************************

-- Garantir que a função handle_new_user tenha acesso aos dados necessários
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.services TO authenticated;

-- Atualizar o cache do Postgrest
NOTIFY pgrst, 'reload schema'; 