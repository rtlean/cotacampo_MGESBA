import React, { useEffect } from 'react';
import { Route, Switch, Redirect, useLocation } from 'wouter';
import { Navbar } from './components/Navbar';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProducerDashboard } from './pages/ProducerDashboard';
import { ResellerDashboard } from './pages/ResellerDashboard';
import { NewQuotationPage } from './pages/NewQuotationPage';
import { supabase } from './services/supabase';

export const App: React.FC = () => {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const currentPath = window.location.pathname;

    const isRecovery =
      hash.includes('type=recovery') ||
      search.includes('type=recovery') ||
      hash.includes('access_token=') ||
      hash.includes('error=') ||
      search.includes('error=') ||
      hash.includes('error_code=') ||
      search.includes('error_code=');

    if (isRecovery && currentPath !== '/redefinir-senha') {
      window.history.replaceState({}, '', `/redefinir-senha${search}${hash}`);
      setLocation(`/redefinir-senha${search}${hash}`);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        const currSearch = window.location.search || '';
        const currHash = window.location.hash || '';
        window.history.replaceState({}, '', `/redefinir-senha${currSearch}${currHash}`);
        setLocation(`/redefinir-senha${currSearch}${currHash}`);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [setLocation]);

  return (
    <div className="min-h-screen flex flex-col bg-sand-50">
      <Navbar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={RegisterPage} />
          <Route path="/cadastro" component={RegisterPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/recuperar-senha" component={ForgotPasswordPage} />
          <Route path="/redefinir-senha" component={ResetPasswordPage} />
          <Route path="/produtor/dashboard" component={ProducerDashboard} />
          <Route path="/produtor/cotacoes/nova" component={NewQuotationPage} />
          <Route path="/revenda/dashboard" component={ResellerDashboard} />
          <Route>
            <Redirect to="/cadastro" />
          </Route>
        </Switch>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} CotaCampo. Conectando produtores e revendas de MG, ES e BA.</p>
          <p className="text-slate-400">Especializado em Café, Cacau, Pimenta-do-reino e Mamão</p>
        </div>
      </footer>
    </div>
  );
};
