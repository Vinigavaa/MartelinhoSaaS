import { useState } from 'react';
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';
import logoImg from '../assets/logo.png';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="flex justify-center">
            <img src={logoImg} alt="Autofy" className="h-14" />
          </div>
          <p className="mt-2 text-sm md:text-base text-blue-600">
            Sistema de Gestão para Funilaria e Pintura
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 border border-gray-100">
          {/* Tabs para alternar entre login e registro */}
          <div className="mb-6 flex border-b border-gray-200">
            <button
              className={`flex-1 py-3 px-1 text-center border-b-2 font-medium text-sm ${
                isLogin
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setIsLogin(true)}
            >
              Entrar
            </button>
            <button
              className={`flex-1 py-3 px-1 text-center border-b-2 font-medium text-sm ${
                !isLogin
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setIsLogin(false)}
            >
              Criar Conta
            </button>
          </div>

          {isLogin ? <LoginForm /> : <RegisterForm />}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {isLogin ? 'Primeiro acesso? ' : 'Já tem uma conta? '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              {isLogin ? 'Crie sua conta' : 'Entre agora'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
} 