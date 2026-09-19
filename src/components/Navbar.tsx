import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'wouter';
import { Sprout, LogOut, User, PlusCircle } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  const displayName = user
    ? user.role === 'RESELLER'
      ? user.nomeFantasia
      : user.farmName || user.name
    : '';

  const dashboardPath = user?.role === 'RESELLER' ? '/revenda/dashboard' : '/produtor/dashboard';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-agro-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Region Badge */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-agro-700 to-agro-950 flex items-center justify-center text-white shadow-sm shadow-agro-900/20 group-hover:scale-105 transition-transform">
                <Sprout className="w-5 h-5 text-agro-200" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-xl font-bold tracking-tight text-agro-950 leading-none">
                  CotaCampo
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-agro-700 mt-0.5">
                  Agronegócio MG • ES • BA
                </span>
              </div>
            </Link>
          </div>

          {/* Right Navigation */}
          <nav className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <Link
                  href={dashboardPath}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-agro-50 text-agro-800 text-xs font-medium border border-agro-200"
                >
                  <User className="w-3.5 h-3.5 text-agro-600" />
                  <span>{displayName}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-agro-700 text-white">
                    {user.role === 'RESELLER' ? 'REVENDA' : 'PRODUTOR'}
                  </span>
                </Link>

                {user.role === 'PRODUCER' && (
                  <Link
                    href="/produtor/cotacoes/nova"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-agro-600 hover:bg-agro-700 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Nova Cotação</span>
                  </Link>
                )}

                {user.role === 'RESELLER' && (
                  <Link
                    href="/revenda/oportunidades"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-agro-700 hover:bg-agro-800 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    <span>Mural de Oportunidades</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sair da conta"
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-agro-800 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  className="px-4 py-2 text-sm font-semibold text-white bg-agro-700 hover:bg-agro-800 rounded-lg shadow-sm transition-all hover:shadow"
                >
                  Cadastre-se
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
