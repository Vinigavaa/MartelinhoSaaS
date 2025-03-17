import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { signIn, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!email || !password) {
      setErrorMessage('Por favor, preencha todos os campos');
      return;
    }

    try {
      await signIn(email, password);
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      
      // Mensagens de erro mais amigáveis
      if (error.message?.includes('Invalid login credentials')) {
        setErrorMessage('Email ou senha incorretos');
      } else if (error.message?.includes('Email not confirmed')) {
        setErrorMessage('Confirme seu email antes de fazer login');
      } else {
        setErrorMessage('Erro ao fazer login. Tente novamente mais tarde.');
      }
      
      toast.error(errorMessage || 'Erro ao fazer login');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="text-center text-2xl font-bold text-gray-900">
          Entrar na sua conta
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Acesse o sistema para gerenciar seus serviços
        </p>
      </div>
      
      {errorMessage && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      )}
      
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="form-label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="input-field"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <div>
          <label htmlFor="password" className="form-label">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="input-field"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Entrando...
              </span>
            ) : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  );
} 