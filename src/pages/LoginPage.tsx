import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, Link } from 'wouter';
import { FormInput } from '../components/FormInput';
import { Sprout, Mail, Lock, LogIn, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginMock } = useAuth();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Por favor informe seu e-mail');
      return;
    }
    if (!password) {
      setError('Por favor informe sua senha');
      return;
    }

    loginMock(email);
    setLocation('/produtor/dashboard');
  };

  const handleQuickDemo = () => {
    loginMock('produtor.linhares@agro.com.br');
    setLocation('/produtor/dashboard');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sand-50 to-agro-50/20">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-agro-700 text-white shadow-md shadow-agro-900/20 mb-4">
            <Sprout className="w-6 h-6 text-agro-200" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-slate-900 tracking-tight">
            Acessar o CotaCampo
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Acesse seus pedidos de cotação e propostas de revendas de MG, ES e BA
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-soft border border-agro-100">
          <form onSubmit={handleLogin} className="space-y-4">
            <FormInput
              id="login-email"
              type="email"
              label="E-mail"
              required
              placeholder="seu.email@fazenda.com.br"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              icon={<Mail className="w-4 h-4" />}
            />

            <FormInput
              id="login-password"
              type="password"
              label="Senha"
              required
              placeholder="Sua senha de acesso"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              icon={<Lock className="w-4 h-4" />}
            />

            {error && (
              <p role="alert" className="text-xs text-red-600 font-medium animate-fade-in">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-agro-700 hover:bg-agro-800 text-white font-semibold text-sm shadow-md shadow-agro-900/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Entrar</span>
            </button>
          </form>

          {/* Quick Demo button */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleQuickDemo}
              className="w-full py-2.5 px-4 rounded-lg bg-agro-50 hover:bg-agro-100 text-agro-800 text-xs font-semibold border border-agro-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Acessar Demonstração (Produtor em Linhares - ES)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Ainda não possui conta?{' '}
            <Link href="/cadastro" className="font-semibold text-agro-700 hover:underline">
              Criar conta de Produtor Rural
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
