-- Adicionar coluna tenant_id sem NOT NULL
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users;

-- Habilitar RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Usuários podem ver seus próprios serviços" ON public.services;
DROP POLICY IF EXISTS "Usuários podem criar seus próprios serviços" ON public.services;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios serviços" ON public.services;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios serviços" ON public.services;

-- Criar política para admin ver todos os serviços
CREATE POLICY "Admin pode ver todos os serviços"
    ON public.services FOR SELECT
    USING (tenant_id IS NULL OR auth.uid() = tenant_id);

-- Criar política para usuários verem apenas seus serviços
CREATE POLICY "Usuários podem criar seus próprios serviços"
    ON public.services FOR INSERT
    WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Usuários podem atualizar seus próprios serviços"
    ON public.services FOR UPDATE
    USING (auth.uid() = tenant_id);

CREATE POLICY "Usuários podem deletar seus próprios serviços"
    ON public.services FOR DELETE
    USING (auth.uid() = tenant_id);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_services_tenant_id ON public.services(tenant_id);

-- Atualizar o cache do Postgrest
NOTIFY pgrst, 'reload schema'; 