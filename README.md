# MartelinhoSaaS

Sistema de gerenciamento de serviços para empresas de martelinho de ouro, com autenticação multi-tenant e gerenciamento de serviços para cada usuário.

## Funcionalidades

- **Autenticação Multi-Tenant**: Cada empresa tem acesso apenas aos seus próprios dados
- **Gerenciamento de Serviços**: Cadastro, edição e exclusão de serviços de martelinho
- **Dashboard Financeiro**: Visualização de faturamento por períodos, crescimento e detalhamento mensal
- **Geração de Notas Fiscais**: Criação de PDFs com as informações dos serviços prestados
- **Busca e Filtro**: Filtragem dos serviços cadastrados por nome de cliente ou placa do veículo

## Tecnologias

- **Frontend**: React, TypeScript, Vite
- **Estilização**: TailwindCSS
- **Backend**: Supabase (Banco de dados PostgreSQL, Autenticação, Row-Level Security)
- **Biblioteca de Componentes**: Componentes próprios baseados em princípios de design system
- **Documentos**: PDFMake para geração de notas fiscais
- **Formatação de Datas**: date-fns

## Estrutura do Projeto

```
src/
├── components/         # Componentes reutilizáveis
│   ├── FinanceDashboard.tsx
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── ServiceForm.tsx
├── contexts/           # Contextos React
│   └── AuthContext.tsx
├── lib/                # Bibliotecas e utilitários
│   ├── generateInvoicePDF.ts
│   └── supabase.ts
├── pages/              # Páginas da aplicação
│   └── AuthPage.tsx
├── utils/              # Funções utilitárias
│   └── formatters.ts
├── App.tsx             # Componente principal
├── index.css           # Estilos globais
├── main.tsx            # Ponto de entrada
├── types.ts            # Definição de tipos
└── vite-env.d.ts       # Tipos para o Vite
```

## Banco de Dados

O projeto utiliza o Supabase como backend, com as seguintes tabelas:

- **profiles**: Perfis de usuários com informações das empresas
- **services**: Registros de serviços de martelinho com RLS (Row Level Security)

## Scripts SQL

Na pasta `supabase/` estão os scripts para configuração do banco de dados:

- **auth-setup.sql**: Configuração inicial de autenticação e tabelas
- **fix-profile-policy.sql**: Correções para políticas da tabela profiles
- **fix-services.sql**: Correções e ajustes para a tabela services

## Instalação

```bash
# Clonar o repositório
git clone https://seu-repositorio/MartelinhoSaaS.git
cd MartelinhoSaaS

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas credenciais do Supabase

# Iniciar o servidor de desenvolvimento
npm run dev
```

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Compila o projeto para produção
- `npm run lint` - Executa o linter para verificar o código
- `npm run preview` - Visualiza a build de produção localmente
- `npm run clean` - Remove arquivos compilados da pasta dist

## Implementação de Multi-Tenant

O sistema implementa isolamento de dados através do conceito de multi-tenancy baseado em coluna:

1. Cada registro na tabela `services` possui um campo `tenant_id` que identifica o proprietário
2. Policies do PostgreSQL restringem o acesso baseado no ID do usuário autenticado
3. O AuthContext garante que apenas usuários autenticados acessem as funcionalidades

## Dashboard Financeiro

O dashboard oferece insights sobre o desempenho financeiro:

- Faturamento por períodos (hoje, semana, mês, ano)
- Histórico mensal com cálculo de crescimento
- Detalhamento de serviços por mês selecionado
- Métricas de faturamento, total de serviços e ticket médio

Este projeto está licenciado sob a licença MIT. 
