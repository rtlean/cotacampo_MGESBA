import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, Link } from 'wouter';
import { FormInput } from '../components/FormInput';
import { loginSchema } from '../schemas/login.schema';
import { Sprout, Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validação inicial via schema Zod
    const validation = loginSchema.safeParse({ identifier, password });
    if (!validation.success) {
      setError('E-mail/telefone ou senha incorretos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login({ identifier, password });
      if (res.success) {
        if (res.role === 'RESELLER') {
          setLocation('/revenda/dashboard');
        } else {
          setLocation('/produtor/dashboard');
        }
      } else {
        setError(res.error || 'E-mail/telefone ou senha incorretos.');
      }
    } catch {
      setError('E-mail/telefone ou senha incorretos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sand-50 to-agro-50/20">
      <div className="max-w-md w-full">
        {/* Top Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-agro-700 text-white shadow-md shadow-agro-900/20 mb-4">
            <Sprout className="w-6 h-6 text-agro-200" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-slate-900 tracking-tight">
            Acessar o CotaCampo
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Acesso unificado para Produtores Rurais e Revendas de MG, ES e BA
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white p-8 rounded-2xl shadow-soft border border-agro-100">
          <form onSubmit={handleLogin} noValidate className="space-y-4">
            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2.5 animate-fade-in"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <FormInput
              id="identifier"
              type="text"
              label="E-mail ou Telefone"
              required
              placeholder="seu.email@agro.com.br ou (XX) 9XXXX-XXXX"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (error) setError('');
              }}
              icon={<Mail className="w-4 h-4" />}
            />

            <FormInput
              id="password"
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

            <div className="flex items-center justify-end -mt-1">
              <Link
                href="/recuperar-senha"
                className="text-xs font-semibold text-agro-700 hover:text-agro-800 hover:underline"
              >
                Esqueceu sua senha?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-agro-700 hover:bg-agro-800 active:bg-agro-900 text-white font-semibold text-sm shadow-md shadow-agro-900/10 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Entrar</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Ainda não possui conta?{' '}
            <Link href="/cadastro" className="font-semibold text-agro-700 hover:underline">
              Cadastre-se no CotaCampo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
