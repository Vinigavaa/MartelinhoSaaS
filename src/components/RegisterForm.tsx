import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { signUp, loading } = useAuth();

  const validateForm = () => {
    if (!email || !password || !fullName || !companyName) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios');
      return false;
    }
    
    if (password.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres');
      return false;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
      setErrorMessage('Por favor, informe um email válido');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!validateForm()) return;

    try {
      await signUp(email, password, fullName, companyName, phone);
      toast.success('Conta criada com sucesso! Faça login para continuar.');
    } catch (error: any) {
      console.error('Erro ao criar conta:', error);
      
      // Mensagens de erro mais amigáveis
      if (error.message?.includes('Email already registered')) {
        setErrorMessage('Este email já está registrado. Use outro email ou tente fazer login.');
      } else if (error.message?.includes('Password should be at least 6 characters')) {
        setErrorMessage('A senha deve ter pelo menos 6 caracteres');
      } else {
        setErrorMessage('Erro ao criar conta. Tente novamente mais tarde.');
      }
      
      toast.error(errorMessage || 'Erro ao criar conta');
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a formatação conforme o usuário digita
    if (numbers.length <= 2) {
      return `(${numbers}`;
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = formatPhoneNumber(e.target.value);
    setPhone(formattedPhone);
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="text-center text-2xl font-bold text-gray-900">
          Criar nova conta
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Registre-se para começar a gerenciar seus serviços
        </p>
      </div>
      
      {errorMessage && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      )}
      
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="fullName" className="form-label">
            Nome completo <span className="text-red-500">*</span>
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            className="input-field"
            placeholder="Seu nome completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        
        <div>
          <label htmlFor="companyName" className="form-label">
            Nome da empresa <span className="text-red-500">*</span>
          </label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            required
            className="input-field"
            placeholder="Nome da sua empresa"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>
        
        <div>
          <label htmlFor="phone" className="form-label">
            Telefone <span className="text-gray-400 text-xs">(opcional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="text"
            className="input-field"
            placeholder="(00) 00000-0000"
            value={phone}
            onChange={handlePhoneChange}
            maxLength={15}
          />
        </div>
        
        <div>
          <label htmlFor="email" className="form-label">
            Email <span className="text-red-500">*</span>
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
            Senha <span className="text-red-500">*</span>
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
          <p className="mt-1 text-xs text-gray-500">A senha deve ter pelo menos 6 caracteres</p>
        </div>

        <div className="pt-2">
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
                Criando conta...
              </span>
            ) : 'Criar conta'}
          </button>
        </div>
      </form>
    </div>
  );
} 