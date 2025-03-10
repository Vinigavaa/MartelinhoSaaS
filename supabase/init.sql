-- Habilitar a extensão pgcrypto para uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verificar se a tabela existe e alterá-la para suportar arrays
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'services') THEN
        -- Se a tabela existir, adicione a coluna repaired_parts se não existir
        IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.services'::regclass AND attname = 'repaired_parts') THEN
            ALTER TABLE public.services ADD COLUMN repaired_parts TEXT[] DEFAULT '{}';
            
            -- Migrar dados da coluna antiga para a nova
            UPDATE public.services SET repaired_parts = ARRAY[repaired_part] WHERE repaired_part IS NOT NULL;
        END IF;
    ELSE
        -- Criar a tabela se não existir
        CREATE TABLE public.services (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            client_name TEXT NOT NULL,
            service_date DATE NOT NULL,
            car_plate TEXT NOT NULL,
            car_model TEXT NOT NULL,
            service_value DECIMAL(10, 2) NOT NULL,
            repaired_parts TEXT[] DEFAULT '{}',
            repaired_part TEXT, -- Mantida para compatibilidade
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END;
$$;

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes que possam estar com problema
DROP POLICY IF EXISTS "Allow anonymous SELECT" ON public.services;
DROP POLICY IF EXISTS "Allow anonymous INSERT" ON public.services;
DROP POLICY IF EXISTS "Allow anonymous UPDATE" ON public.services;
DROP POLICY IF EXISTS "Allow anonymous DELETE" ON public.services;

-- Criar novas políticas de segurança
CREATE POLICY "Allow anonymous SELECT" ON public.services
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous INSERT" ON public.services
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous UPDATE" ON public.services
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous DELETE" ON public.services
    FOR DELETE USING (true);

-- Comentários sobre a tabela e suas colunas
COMMENT ON TABLE public.services IS 'Tabela para armazenar os serviços de reparo';
COMMENT ON COLUMN public.services.id IS 'Identificador único do serviço';
COMMENT ON COLUMN public.services.client_name IS 'Nome do cliente';
COMMENT ON COLUMN public.services.service_date IS 'Data em que o serviço foi realizado';
COMMENT ON COLUMN public.services.car_plate IS 'Placa do carro';
COMMENT ON COLUMN public.services.car_model IS 'Modelo do carro';
COMMENT ON COLUMN public.services.service_value IS 'Valor do serviço em reais';
COMMENT ON COLUMN public.services.repaired_parts IS 'Array de peças do carro que foram reparadas';
COMMENT ON COLUMN public.services.repaired_part IS 'Campo legado - substituído por repaired_parts';
COMMENT ON COLUMN public.services.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN public.services.updated_at IS 'Data e hora da última atualização do registro'; 