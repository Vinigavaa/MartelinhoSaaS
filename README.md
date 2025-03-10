# Gerenciamento de Serviços de Reparos Automotivos

Sistema para controle de serviços de uma oficina de reparos automotivos, desenvolvido com React, TypeScript, TailwindCSS e Supabase.

## Funcionalidades

- Cadastro, edição e exclusão de serviços de reparo
- Visualização de todos os serviços em uma tabela organizada
- Dados armazenados em um banco de dados Supabase

## Instalação

1. Clone este repositório
2. Instale as dependências:
```
npm install
```
3. Inicie o servidor de desenvolvimento:
```
npm run dev
```

## Configuração do Supabase

Para que a aplicação funcione corretamente, é necessário configurar o banco de dados no Supabase:

1. Crie uma conta no [Supabase](https://supabase.com/) caso ainda não tenha
2. Crie um novo projeto
3. Obtenha a URL e a chave anônima (anon key) do seu projeto
4. Crie o arquivo `.env` na raiz do projeto com as seguintes variáveis:
```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anônima_do_supabase
```

### Criação da tabela no Supabase

Para criar a tabela necessária, acesse o Editor SQL do seu projeto no Supabase e execute o script SQL localizado em `supabase/init.sql`.

### Solução para erro 401

Se você receber um erro 401 ao tentar inserir dados, verifique:

1. Se a tabela `services` existe no banco de dados
2. Se as políticas RLS (Row Level Security) estão configuradas corretamente
3. Se a chave anônima (anon key) está correta no seu arquivo `.env`

Para corrigir o erro, execute o script SQL em `supabase/init.sql` no Editor SQL do Supabase. Isso irá:

- Criar a tabela `services` (se não existir)
- Configurar as políticas de segurança para permitir operações CRUD para usuários anônimos

## Estrutura do projeto

- `src/App.tsx`: Componente principal da aplicação
- `src/components/ServiceForm.tsx`: Formulário para cadastro e edição de serviços
- `src/lib/supabase.ts`: Configuração da conexão com o Supabase
- `src/types.ts`: Tipos e interfaces utilizados na aplicação
- `supabase/init.sql`: Script SQL para configuração do banco de dados 