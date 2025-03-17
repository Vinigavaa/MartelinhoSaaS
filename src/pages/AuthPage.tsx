import { useState } from 'react';
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="card max-w-md w-full animate-fade-in">
        {/* Cabeçalho e logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">MartelinhoSaaS</h1>
          <p className="text-gray-600 text-sm">
            {isLogin 
              ? 'Faça login para acessar o sistema' 
              : 'Crie sua conta para começar a usar o sistema'}
          </p>
        </div>

        {/* Forms */}
        {isLogin ? <LoginForm /> : <RegisterForm />}

        {/* Alternância entre login e registro */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            {isLogin ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}
          </p>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="mt-2 text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            {isLogin ? 'Criar uma conta' : 'Fazer login'}
          </button>
        </div>
      </div>
    </div>
  );
} 