import React, { useState, useEffect } from 'react';
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
  MailCheck,
} from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();

  const getParam = (name: string): string => {
    if (typeof window === 'undefined') return '';
    const searchParams = new URLSearchParams(window.location.search);
    const valFromSearch = searchParams.get(name);
    if (valFromSearch) return valFromSearch;

    if (window.location.hash) {
      const rawHash = window.location.hash.startsWith('#')
        ? window.location.hash.substring(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(rawHash);
      return hashParams.get(name) || '';
    }
    return '';
  };

  const initialToken =
    getParam('token') ||
    getParam('code') ||
    getParam('access_token') ||
    '';
  const initialType = getParam('type');
  const errorDescription = getParam('error_description');
  const errorCode = getParam('error_code');

  const isEmailRecoveryInit =
    initialType === 'recovery' || Boolean(getParam('access_token'));

  let initialErrorMessage = '';
  if (errorDescription || errorCode === 'otp_expired') {
    initialErrorMessage =
      'Este link de e-mail está expirado ou inválido. Por favor, solicite um novo link de recuperação.';
  }

  const [codeOrToken, setCodeOrToken] = useState<string>(
    initialToken || (isEmailRecoveryInit ? 'email_recovery_token' : '')
  );
  const [isEmailRecovery, setIsEmailRecovery] = useState<boolean>(isEmailRecoveryInit);
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string>(initialErrorMessage);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    const token = getParam('token') || getParam('code') || getParam('access_token');
    const type = getParam('type');
    const errDesc = getParam('error_description');
    const errCode = getParam('error_code');

    if (errDesc || errCode === 'otp_expired') {
      setError('Este link de e-mail está expirado ou inválido. Por favor, solicite um novo link de recuperação.');
    } else if (type === 'recovery' || token) {
      setIsEmailRecovery(type === 'recovery' || Boolean(getParam('access_token')));
      setCodeOrToken(token || 'email_recovery_token');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validação com Zod
    const validation = resetPasswordSchema.safeParse({
      codeOrToken: codeOrToken || 'email_recovery_token',
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

              {isEmailRecovery && !error && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2.5 animate-fade-in">
                  <MailCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Link de e-mail verificado com sucesso! Digite sua nova senha abaixo.</span>
                </div>
              )}

              {!isEmailRecovery && (
                <FormInput
                  id="codeOrToken"
                  label="Código de 6 dígitos ou Token"
                  type="text"
                  required
                  placeholder="Ex: 123456 ou rst_..."
                  value={codeOrToken}
                  onChange={(e) => setCodeOrToken(e.target.value)}
                  icon={<KeyRound className="w-4 h-4" />}
                />
              )}

              <FormInput
                id="password"
                label="Nova Senha"
                type="password"
                required
                placeholder="Mínimo de 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
              />

              <FormInput
                id="confirmPassword"
                label="Confirmar Nova Senha"
                type="password"
                required
                placeholder="Repita a nova senha exatamente igual"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-agro-700 hover:bg-agro-800 active:bg-agro-900 text-white font-semibold text-sm shadow-md shadow-agro-900/10 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isSubmitting ? 'Salvando...' : 'Salvar Nova Senha'}</span>
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
            <div role="status" className="text-center py-4 space-y-4 animate-fade-in">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <h2 className="font-serif text-xl font-bold text-slate-900">
                Senha Redefinida com Sucesso!
              </h2>

              <p className="text-sm text-slate-600 max-w-sm mx-auto">
                Sua credencial de acesso foi atualizada com segurança. Agora você já pode fazer login na sua conta com a nova senha.
              </p>

              <div className="pt-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-agro-700 hover:bg-agro-800 text-white font-semibold text-sm shadow-md transition-colors"
                >
                  <span>Fazer Login</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
