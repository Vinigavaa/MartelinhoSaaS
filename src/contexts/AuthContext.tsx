import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Definição do tipo do contexto
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, companyName: string, phone?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Criação do contexto com valor inicial undefined
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook personalizado para usar o contexto de autenticação
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

// Componente provedor do contexto de autenticação
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar sessão e configurar listener para mudanças de autenticação
  useEffect(() => {
    async function setupAuth() {
      // Verificar sessão atual
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);

      // Escutar mudanças na autenticação
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    }

    setupAuth();
  }, []);

  // Função para fazer login
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Função para criar conta
  const signUp = async (email: string, password: string, fullName: string, companyName: string, phone?: string) => {
    setLoading(true);
    try {
      // Criar conta do usuário
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName,
            phone: phone || '',
          },
        },
      });

      if (signUpError) throw signUpError;

      // O perfil será criado automaticamente por um trigger quando o usuário for registrado
      // Nenhuma ação adicional é necessária graças ao migration de auth-setup.sql

      return data;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Função para fazer logout
  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Valor do contexto a ser providenciado
  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 