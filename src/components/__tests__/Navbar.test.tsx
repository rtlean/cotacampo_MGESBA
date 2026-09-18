import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { Navbar } from '../Navbar';
import { AuthProvider } from '../../context/AuthContext';
import { ProducerProfile, ResellerProfile } from '../../types/user';

describe('Navbar Component', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('deve exibir links de Login e Cadastro quando deslogado', () => {
    render(
      <AuthProvider>
        <Navbar />
      </AuthProvider>
    );

    expect(screen.getByRole('link', { name: /Entrar/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /Cadastre-se/i })).toHaveAttribute('href', '/cadastro');
  });

  it('deve exibir nome da fazenda e botão de Nova Cotação para PRODUCER', () => {
    const mockProducer: ProducerProfile = {
      id: 'prod-nav-1',
      role: 'PRODUCER',
      name: 'José Produtor',
      email: 'jose@fazenda.com',
      whatsapp: '(27) 99999-1111',
      farmName: 'Fazenda Sol Nascente',
      state: 'ES',
      city: 'Linhares',
      crops: ['cafe'],
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducer));

    render(
      <AuthProvider>
        <Navbar />
      </AuthProvider>
    );

    expect(screen.getByText('Fazenda Sol Nascente')).toBeInTheDocument();
    expect(screen.getByText('PRODUTOR')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Nova Cotação/i })).toHaveAttribute('href', '/produtor/cotacoes/nova');
  });

  it('deve exibir nome fantasia e badge REVENDA para perfil de revenda', () => {
    const mockReseller: ResellerProfile = {
      id: 'res-nav-1',
      role: 'RESELLER',
      razaoSocial: 'Comércio de Café Ltda',
      nomeFantasia: 'AgroComércio Linhares',
      cnpj: '22.333.444/0001-55',
      corporateEmail: 'vendas@agrocomercio.com',
      whatsapp: '(27) 99888-2222',
      state: 'ES',
      city: 'Linhares',
      deliveryRadiusKm: 100,
      coordinates: { lat: -19.3958, lng: -40.0644 },
      categories: ['defensivos'],
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockReseller));

    render(
      <AuthProvider>
        <Navbar />
      </AuthProvider>
    );

    expect(screen.getByText('AgroComércio Linhares')).toBeInTheDocument();
    expect(screen.getByText('REVENDA')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Nova Cotação/i })).not.toBeInTheDocument();
  });

  it('deve realizar logout ao clicar no botão sair', () => {
    const mockProducer: ProducerProfile = {
      id: 'prod-nav-logout',
      role: 'PRODUCER',
      name: 'José Logout',
      email: 'jose.logout@fazenda.com',
      whatsapp: '(27) 99999-1111',
      farmName: 'Fazenda Logout',
      state: 'ES',
      city: 'Linhares',
      crops: ['cafe'],
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducer));

    render(
      <AuthProvider>
        <Navbar />
      </AuthProvider>
    );

    const logoutBtn = screen.getByTitle(/Sair da conta/i);
    fireEvent.click(logoutBtn);

    expect(screen.getByRole('link', { name: /Entrar/i })).toBeInTheDocument();
  });
});
