import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../App';
import { AuthProvider } from '../../context/AuthContext';
import { ResellerProfile } from '../../types/user';

describe('ResellerDashboard Component', () => {
  const mockReseller: ResellerProfile = {
    id: 'res_123',
    role: 'RESELLER',
    razaoSocial: 'AgroVila Insumos Agrícolas Ltda',
    nomeFantasia: 'AgroVila Linhares',
    cnpj: '11.222.333/0001-81',
    corporateEmail: 'contato@agrovilainsumos.com.br',
    whatsapp: '(27) 99888-7766',
    state: 'ES',
    city: 'Linhares',
    deliveryRadiusKm: 100,
    coordinates: { lat: -19.3958, lng: -40.0644 },
    categories: ['defensivos', 'fertilizantes', 'foliares'],
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockReseller));
    window.history.pushState({}, '', '/revenda/dashboard');
  });

  it('deve renderizar os dados da revenda: nome fantasia, CNPJ, localização e raio de entrega', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'AgroVila Linhares' })).toBeInTheDocument();
    expect(screen.getByText(/11\.222\.333\/0001-81/)).toBeInTheDocument();
    expect(screen.getByText(/Linhares — ES/i)).toBeInTheDocument();
    expect(screen.getByText(/100 km/i)).toBeInTheDocument();
  });

  it('deve exibir as categorias comercializadas e mural de oportunidades na área de cobertura', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    expect(screen.getByText(/Defensivos/i)).toBeInTheDocument();
    expect(screen.getByText(/Fertilizantes e Nutrição/i)).toBeInTheDocument();
    expect(screen.getByText(/Nutrição Foliar/i)).toBeInTheDocument();

    // Mural de oportunidades
    expect(screen.getByText(/Mural de Cotações Disponíveis/i)).toBeInTheDocument();
  });
});
