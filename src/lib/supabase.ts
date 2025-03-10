import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Inicializando cliente Supabase');
console.log('URL do Supabase:', supabaseUrl);
console.log('Chave anônima definida:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Verificar se o cliente foi inicializado corretamente
console.log('Cliente Supabase inicializado:', !!supabase);