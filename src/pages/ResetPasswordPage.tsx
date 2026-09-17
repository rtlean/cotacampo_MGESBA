import React, { useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '../context/AuthContext';
import { resetPasswordSchema } from '../schemas/reset-password.schema';
import { FormInput } from '../components/FormInput';
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();

  const getQueryParam = (name: string): string => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get(name) || '';
  };

  const initialToken = getQueryParam('token') || getQueryParam('code') || '';

  const [codeOrToken, setCodeOrToken] = useState<string>(initialToken);
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validação com Zod
    const validation = resetPasswordSchema.safeParse({
      codeOrToken,
      password,
      confirmPassword,
    });

    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Dados inválidos.');
      return;
    }

    if (!codeOrToken.trim()) {
      setError('Informe o código de 6 dígitos ou o link de redefinição.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetPassword(codeOrToken, password);
      if (!result.success) {
        setError(result.error || 'Não foi possível redefinir sua senha.');
      } else {
        setIsSuccess(true);
      }
    } catch {
      setError('Ocorreu um erro ao redefinir a senha. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-sand-50">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-agro-700 text-white shadow-md shadow-agro-900/20 mb-4">
            <KeyRound className="w-6 h-6 text-agro-200" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-slate-900 tracking-tight">
            Criar Nova Senha
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Defina uma nova senha segura para acessar sua conta CotaCampo
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white p-8 rounded-2xl shadow-soft border border-agro-100">
          {!isSuccess ? (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
                id="codeOrToken"
                type="text"
                label="Código de 6 dígitos ou Token"
                required
                placeholder="Ex: 123456 ou rst_..."
                value={codeOrToken}
                onChange={(e) => {
                  setCodeOrToken(e.target.value);
                  if (error) setError('');
                }}
                icon={<KeyRound className="w-4 h-4" />}
              />

              <FormInput
                id="password"
                type="password"
                label="Nova Senha"
                required
                placeholder="Mínimo de 6 caracteres"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                icon={<Lock className="w-4 h-4" />}
              />

              <FormInput
                id="confirmPassword"
                type="password"
                label="Confirmar Nova Senha"
                required
                placeholder="Repita a nova senha exatamente igual"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError('');
                }}
                icon={<Lock className="w-4 h-4" />}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-agro-700 hover:bg-agro-800 active:bg-agro-900 text-white font-semibold text-sm shadow-md shadow-agro-900/10 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Salvar Nova Senha</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="text-xs font-medium text-slate-500 hover:text-agro-700 transition-colors"
                >
                  Cancelar e voltar para o Login
                </Link>
              </div>
            </form>
          ) : (
            <div role="status" className="space-y-6 text-center animate-fade-in">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Senha Redefinida com Sucesso!
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Sua nova senha de acesso foi salva com segurança. Agora você já pode acessar a plataforma CotaCampo com suas novas credenciais.
                </p>
              </div>

              <Link
                href="/login"
                className="w-full py-3 px-4 rounded-xl bg-agro-700 hover:bg-agro-800 text-white font-semibold text-sm shadow-md shadow-agro-900/10 transition-colors inline-flex items-center justify-center gap-2"
              >
                <span>Fazer Login com a Nova Senha</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
