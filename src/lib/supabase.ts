import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isTestEnvironment = process.env.NODE_ENV === 'test';

console.log('Inicializando cliente Supabase');
console.log('URL do Supabase:', supabaseUrl);
console.log('Chave anônima definida:', !!supabaseKey);
console.log('Ambiente de teste:', isTestEnvironment);

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Verificar se o cliente foi inicializado corretamente
console.log('Cliente Supabase inicializado:', !!supabase);
// Exportar a flag de ambiente de teste para uso em outros arquivos
export { isTestEnvironment };