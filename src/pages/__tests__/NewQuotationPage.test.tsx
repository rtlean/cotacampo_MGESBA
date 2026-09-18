import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { NewQuotationPage } from '../NewQuotationPage';
import { AuthProvider } from '../../context/AuthContext';
import { ProducerProfile, ResellerProfile } from '../../types/user';

describe('NewQuotationPage Component', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('deve renderizar a página com dados da fazenda quando o usuário é PRODUCER', () => {
    const mockProducer: ProducerProfile = {
      id: 'prod-123',
      role: 'PRODUCER',
      name: 'Marcos Silva',
      email: 'marcos@fazenda.com.br',
      whatsapp: '(27) 99999-8888',
      farmName: 'Fazenda Boa Esperança',
      state: 'ES',
      city: 'Linhares',
      crops: ['cafe'],
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducer));

    render(
      <AuthProvider>
        <NewQuotationPage />
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Nova Cotação de Insumos/i })).toBeInTheDocument();
    expect(screen.getByText(/Fazenda Boa Esperança/i)).toBeInTheDocument();
    expect(screen.getByText(/Linhares — ES/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voltar ao Dashboard/i })).toHaveAttribute('href', '/produtor/dashboard');
  });

  it('deve renderizar a página com dados da empresa quando o usuário é RESELLER', () => {
    const mockReseller: ResellerProfile = {
      id: 'res-456',
      role: 'RESELLER',
      razaoSocial: 'Agro Comércio Ltda',
      nomeFantasia: 'AgroCenter Linhares',
      cnpj: '11.222.333/0001-81',
      corporateEmail: 'vendas@agrocenter.com',
      whatsapp: '(27) 98888-7777',
      state: 'ES',
      city: 'Linhares',
      deliveryRadiusKm: 50,
      coordinates: { lat: -19.3958, lng: -40.0644 },
      categories: ['fertilizantes'],
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockReseller));

    render(
      <AuthProvider>
        <NewQuotationPage />
      </AuthProvider>
    );

    expect(screen.getByText(/AgroCenter Linhares/i)).toBeInTheDocument();
  });

  it('deve renderizar corretamente mesmo sem usuário autenticado', () => {
    render(
      <AuthProvider>
        <NewQuotationPage />
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Nova Cotação de Insumos/i })).toBeInTheDocument();
    expect(screen.getByText(/MG, ES e BA/i)).toBeInTheDocument();
  });
});
