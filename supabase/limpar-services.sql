-- Limpar todos os registros da tabela services
TRUNCATE public.services;

-- Adicionar coluna tenant_id
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users NOT NULL;

-- Habilitar RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Usuários podem ver seus próprios serviços" ON public.services;
DROP POLICY IF EXISTS "Usuários podem criar seus próprios serviços" ON public.services;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios serviços" ON public.services;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios serviços" ON public.services;

-- Criar novas políticas
CREATE POLICY "Usuários podem ver seus próprios serviços"
    ON public.services FOR SELECT
    USING (auth.uid() = tenant_id);

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