import React from 'react';
import { Route, Switch, Redirect } from 'wouter';
import { Navbar } from './components/Navbar';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProducerDashboard } from './pages/ProducerDashboard';
import { ResellerDashboard } from './pages/ResellerDashboard';

export const App: React.FC = () => {
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
