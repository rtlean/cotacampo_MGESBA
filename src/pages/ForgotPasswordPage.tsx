import React, { useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '../context/AuthContext';
import { forgotPasswordSchema } from '../schemas/forgot-password.schema';
import { PasswordResetResponse } from '../types/user';
import { FormInput } from '../components/FormInput';
import {
  KeyRound,
  Mail,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Send,
  AlertCircle,
  ArrowRight,
  MessageCircle,
} from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { requestPasswordReset } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetResult, setResetResult] = useState<PasswordResetResponse | null>(null);

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setError('');

    // Se já contiver @ ou letras, não aplica máscara de telefone
    if (rawVal.includes('@') || /[a-zA-Z]/.test(rawVal)) {
      setIdentifier(rawVal);
      return;
    }

    // Aplica máscara progressiva de telefone BR: (XX) 9XXXX-XXXX
    const digits = rawVal.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;

    if (digits.length > 0) {
      if (digits.length <= 2) {
        formatted = `(${digits}`;
      } else if (digits.length <= 7) {
        formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      } else {
        formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
      }
    }

    setIdentifier(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validação com schema Zod
    const validation = forgotPasswordSchema.safeParse({ identifier });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Informe um e-mail válido ou número de WhatsApp com DDD.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await requestPasswordReset(identifier);
      setResetResult(response);

      // Se canal WhatsApp com URL gerada, tenta abrir diretamente o WhatsApp Web / App
      if (response.channel === 'whatsapp' && response.whatsappUrl && typeof window !== 'undefined') {
        try {
          window.open(response.whatsappUrl, '_blank');
        } catch {
          // Bloqueado pelo pop-up blocker; usuário utilizará o botão na tela
        }
      }
    } catch {
      setError('Ocorreu um erro ao processar sua solicitação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setIdentifier('');
    setError('');
    setResetResult(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-sand-50">
      <div className="w-full max-w-md">
        {/* Top Branding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-agro-700 text-white shadow-md shadow-agro-900/20 mb-4">
            <KeyRound className="w-6 h-6 text-agro-200" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-slate-900 tracking-tight">
            Recuperar Acesso
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Informe seu e-mail ou WhatsApp cadastrado para receber o link ou código
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white p-8 rounded-2xl shadow-soft border border-agro-100">
          {!resetResult ? (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2.5 animate-fade-in"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <FormInput
                  id="identifier"
                  type="text"
                  label="E-mail ou WhatsApp"
                  required
                  placeholder="ex: produtor@fazenda.com ou (27) 99876-5432"
                  value={identifier}
                  onChange={handleIdentifierChange}
                  icon={<Mail className="w-4 h-4" />}
                />
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Produtores e revendas podem utilizar tanto o e-mail quanto o número com DDD.
                </p>
              </div>

              <div className="rounded-xl bg-agro-50/60 p-3.5 border border-agro-100/80 flex items-start gap-3 text-xs text-agro-900">
                <ShieldCheck className="w-4 h-4 text-agro-700 shrink-0 mt-0.5" />
                <p>
                  Enviamos um link com código de 6 dígitos e token de uso único com validade de <strong>15 minutos</strong>.
                </p>
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
                    <Send className="w-4 h-4" />
                    <span>Enviar link de redefinição</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-agro-700 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar para o Login</span>
                </Link>
              </div>
            </form>
          ) : (
            /* Confirmation State with real dispatch feedback and anti-enumeration compliance */
            <div role="status" className="space-y-5 animate-fade-in text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Solicitação Enviada com Sucesso
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Se este e-mail ou WhatsApp estiver cadastrado, enviamos um link com token de uso único para redefinir sua senha. O link é válido por <strong>15 minutos</strong>.
                </p>
              </div>

              {/* Canal WhatsApp: Disparo e Botão de Abertura Real */}
              {resetResult.channel === 'whatsapp' && (
                <div className="space-y-3 pt-1">
                  {resetResult.whatsappUrl && (
                    <a
                      href={resetResult.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm shadow-md shadow-emerald-900/10 transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>Abrir no WhatsApp e Enviar Mensagem</span>
                    </a>
                  )}

                  {resetResult.code && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Código de 6 dígitos gerado:
                      </span>
                      <div className="text-2xl font-mono font-bold text-agro-800 tracking-widest bg-white py-1.5 px-4 rounded-lg border border-slate-200 inline-block shadow-sm">
                        {resetResult.code}
                      </div>
                      <div className="pt-1">
                        <Link
                          href={`/redefinir-senha?token=${resetResult.resetToken}&code=${resetResult.code}`}
                          className="w-full py-2.5 px-3 rounded-xl bg-agro-700 hover:bg-agro-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <span>Cadastrar Nova Senha com este Código</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Canal E-mail: Feedback Real de Envio e Diagnóstico Técnico */}
              {resetResult.channel === 'email' && (
                <div className="space-y-3 pt-1">
                  {resetResult.deliveryStatus === 'rate_limited' ? (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-900 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-semibold">Diagnóstico do Envio de E-mail</strong>
                        <span>{resetResult.errorMessage}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-left text-xs text-emerald-900 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>E-mail com instruções e link de recuperação enviado com sucesso.</span>
                    </div>
                  )}

                  {resetResult.code && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Código de 6 dígitos gerado:
                      </span>
                      <div className="text-2xl font-mono font-bold text-agro-800 tracking-widest bg-white py-1.5 px-4 rounded-lg border border-slate-200 inline-block shadow-sm">
                        {resetResult.code}
                      </div>
                      <div className="pt-1">
                        <Link
                          href={`/redefinir-senha?token=${resetResult.resetToken}&code=${resetResult.code}`}
                          className="w-full py-2.5 px-3 rounded-xl bg-agro-700 hover:bg-agro-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <span>Cadastrar Nova Senha com este Código</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-left text-xs text-slate-500 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  O link e o código expiram automaticamente após 15 minutos por segurança.
                </span>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Enviar para outro contato
                </button>
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-white bg-agro-700 hover:bg-agro-800 transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <span>Voltar para o Login</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
