# Sistema de Gerenciamento para Oficina de Reparos Automotivos

<p align="center">
  <img src="https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.2.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-5.1.4-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Supabase-2.39.7-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4.1-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
</p>

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração do Supabase](#-configuração-do-supabase)
- [Executando o Projeto](#-executando-o-projeto)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Solução de Problemas](#-solução-de-problemas)
- [Licença](#-licença)

## 🔍 Visão Geral

Um sistema completo de gerenciamento para oficinas de reparos automotivos, permitindo cadastrar, visualizar, editar e excluir serviços realizados. Inclui funcionalidades de busca, seleção de múltiplas peças reparadas e um dashboard financeiro para acompanhamento do faturamento.

![Dashboard da Aplicação](https://via.placeholder.com/800x400?text=Dashboard+da+Aplicação)

## ✨ Funcionalidades

- **Gerenciamento de Serviços**:
  - Cadastro de serviços com dados do cliente, veículo e reparo
  - Edição e exclusão de serviços
  - Seleção de múltiplas peças reparadas

- **Busca e Filtragem**:
  - Busca por nome do cliente
  - Busca por placa do veículo

- **Dashboard Financeiro**:
  - Visualização de faturamento diário, semanal, mensal e anual
  - Histórico de faturamento por mês
  - Seleção de mês específico para análise detalhada

## 🚀 Tecnologias

- **Frontend**: React, TypeScript, TailwindCSS
- **Build**: Vite
- **Banco de Dados**: Supabase (PostgreSQL)
- **Estilização**: TailwindCSS
- **Formatação de Data**: date-fns
- **Ícones**: Lucide React
- **Notificações**: React Hot Toast

## 📋 Pré-requisitos

Antes de começar, certifique-se de que seu ambiente atende aos seguintes requisitos:

- **Node.js**: v16 ou superior ([Baixar](https://nodejs.org/))
- **npm**: v8 ou superior (incluído com o Node.js)
- **Conta no Supabase**: Gratuita para projetos pequenos ([Registrar](https://supabase.com/))

## 🔧 Instalação

Siga estes passos para configurar o projeto localmente:

1. **Clone o repositório**:

```bash
git clone https://github.com/seu-usuario/sistema-oficina-reparos.git
cd sistema-oficina-reparos
```

2. **Instale as dependências**:

```bash
npm install
```

3. **Configure as variáveis de ambiente**:

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anônima_do_supabase
```

## 🗃️ Configuração do Supabase

1. **Crie uma conta e um projeto no Supabase**:
   - Acesse [supabase.com](https://supabase.com/) e faça login
   - Crie um novo projeto e anote a URL e a chave anônima (anon key)

2. **Configure a tabela `services`**:
   - No painel do Supabase, acesse a seção "SQL Editor"
   - Execute o script SQL abaixo para criar a tabela e configurar as permissões:

```sql
-- Habilitar a extensão pgcrypto para uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Criar tabela services
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name TEXT NOT NULL,
    service_date DATE NOT NULL,
    car_plate TEXT NOT NULL,
    car_model TEXT NOT NULL,
    service_value DECIMAL(10, 2) NOT NULL,
    repaired_parts TEXT[] DEFAULT '{}',
    repaired_part TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes que possam estar com problema
DROP POLICY IF EXISTS "Allow anonymous SELECT" ON public.services;
DROP POLICY IF EXISTS "Allow anonymous INSERT" ON public.services;
DROP POLICY IF EXISTS "Allow anonymous UPDATE" ON public.services;
DROP POLICY IF EXISTS "Allow anonymous DELETE" ON public.services;

-- Criar políticas de segurança
CREATE POLICY "Allow anonymous SELECT" ON public.services
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous INSERT" ON public.services
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous UPDATE" ON public.services
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous DELETE" ON public.services
    FOR DELETE USING (true);
```

## 🚀 Executando o Projeto

Depois de instalar as dependências e configurar o Supabase, você pode iniciar o servidor de desenvolvimento:

```bash
npm run dev
```

O aplicativo será executado no modo de desenvolvimento e estará disponível em [http://localhost:5173](http://localhost:5173).

### 🏗️ Build para Produção

Para gerar uma versão otimizada para produção:

```bash
npm run build
```

Os arquivos de build serão gerados na pasta `dist`.

Para visualizar a versão de produção localmente:

```bash
npm run preview
```

## 📁 Estrutura do Projeto

```
projeto/
├── src/                    # Código fonte
│   ├── components/         # Componentes React
│   │   ├── ServiceForm.tsx # Formulário de serviços
│   │   └── FinanceDashboard.tsx # Dashboard financeiro
│   ├── lib/
│   │   └── supabase.ts     # Configuração do cliente Supabase
│   ├── App.tsx             # Componente principal
│   ├── main.tsx            # Ponto de entrada
│   ├── types.ts            # Tipos e interfaces TypeScript
│   └── index.css           # Estilos globais
├── supabase/
│   └── init.sql            # Script para configuração do banco de dados
├── public/                 # Arquivos estáticos
├── .env                    # Variáveis de ambiente
├── package.json            # Dependências e scripts
├── tailwind.config.js      # Configuração do TailwindCSS
├── vite.config.ts          # Configuração do Vite
└── README.md               # Este arquivo
```

## 🔍 Solução de Problemas

### Erro 401 (Unauthorized)

Se você encontrar um erro 401 ao tentar inserir ou atualizar serviços:

1. Verifique se suas variáveis de ambiente estão corretas em `.env`
2. Certifique-se de que a tabela `services` existe no Supabase
3. Confirme que as políticas RLS (Row Level Security) estão configuradas corretamente
4. Execute o script SQL abaixo para corrigir a restrição NOT NULL:

```sql
-- Modificar a coluna repaired_part para permitir valores nulos
ALTER TABLE public.services 
ALTER COLUMN repaired_part DROP NOT NULL;

-- Atualizar o cache do Postgrest (API do Supabase)
NOTIFY pgrst, 'reload schema';
```

### Erro "Could not find the 'repaired_parts' column"

Se você vir este erro, execute o script SQL a seguir:

```sql
-- Adicionar a coluna repaired_parts se ela não existir
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS repaired_parts TEXT[] DEFAULT '{}';

-- Migrar dados da coluna antiga para a nova
UPDATE public.services 
SET repaired_parts = ARRAY[repaired_part] 
WHERE repaired_part IS NOT NULL AND (repaired_parts IS NULL OR repaired_parts = '{}');

-- Atualizar o cache do Postgrest
NOTIFY pgrst, 'reload schema';
```

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

Desenvolvido com ❤️ e muito ☕ 