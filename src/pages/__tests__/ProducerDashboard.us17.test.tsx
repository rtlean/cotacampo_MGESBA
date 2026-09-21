import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProducerDashboard } from '../ProducerDashboard';
import { AuthProvider } from '../../context/AuthContext';
import { ProducerProfile } from '../../types/user';
import { packageService } from '../../services/package.service';
import { quotationService } from '../../services/quotation.service';
import { supabase } from '../../services/supabase';

// Mock do wouter
vi.mock('wouter', () => ({
  useLocation: () => ['/produtor/dashboard', vi.fn()],
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('US17 – Meus Pacotes Tecnológicos no Dashboard do Produtor', () => {
  const mockProducer: ProducerProfile = {
    id: 'prod-777',
    role: 'PRODUCER',
    name: 'Carlos Fazendeiro',
    email: 'carlos@fazenda.com.br',
    whatsapp: '(27) 99999-7777',
    farmName: 'Fazenda Rio Doce',
    state: 'ES',
    city: 'Linhares',
    crops: ['cafe', 'pimenta'],
    createdAt: new Date().toISOString(),
  };

  const mockPackages = [
    {
      id: 'pkg-florada-1',
      producerId: 'prod-777',
      name: 'Adubação de Florada',
      cropType: 'Café Conilon',
      itemsCount: 2,
      createdAt: new Date('2026-09-01T10:00:00Z').toISOString(),
      updatedAt: new Date('2026-09-01T10:00:00Z').toISOString(),
      items: [
        { id: '1', packageId: 'pkg-florada-1', productName: 'Adubo NPK 20-05-20', quantity: 50, unit: 'Sc', acceptsGeneric: true },
        { id: '2', packageId: 'pkg-florada-1', productName: 'Foliar Zinco + Boro', quantity: 20, unit: 'L', acceptsGeneric: false },
      ],
    },
    {
      id: 'pkg-pulv-2',
      producerId: 'prod-777',
      name: 'Pulverização Preventiva - Pimenta',
      cropType: 'Pimenta-do-Reino',
      itemsCount: 1,
      createdAt: new Date('2026-09-10T14:00:00Z').toISOString(),
      updatedAt: new Date('2026-09-10T14:00:00Z').toISOString(),
      items: [
        { id: '3', packageId: 'pkg-pulv-2', productName: 'Fungicida Cobrex', quantity: 30, unit: 'Kg', acceptsGeneric: true },
      ],
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('cotacampo_auth_user', JSON.stringify(mockProducer));
    vi.clearAllMocks();

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    vi.spyOn(quotationService, 'getProducerQuotations').mockResolvedValue([]);
    vi.spyOn(packageService, 'listMyPackages').mockResolvedValue(mockPackages);
    vi.spyOn(packageService, 'deletePackage').mockResolvedValue(true);
  });

  it('deve exibir a aba [ Meus Pacotes Tecnológicos ] com a contagem de pacotes', async () => {
    render(
      <AuthProvider>
        <ProducerDashboard />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('tab-my-packages')).toBeInTheDocument();
      expect(screen.getByText(/Meus Pacotes Tecnológicos \(2\)/i)).toBeInTheDocument();
    });
  });

  it('ao clicar na aba de pacotes, renderiza os cards com insumos e botão de recompra em 1-clique', async () => {
    render(
      <AuthProvider>
        <ProducerDashboard />
      </AuthProvider>
    );

    const packagesTab = await screen.findByTestId('tab-my-packages');
    fireEvent.click(packagesTab);

    // Seção de pacotes deve estar visível
    expect(screen.getByTestId('packages-section')).toBeInTheDocument();
    expect(screen.getByText('Adubação de Florada')).toBeInTheDocument();
    expect(screen.getByText('Pulverização Preventiva - Pimenta')).toBeInTheDocument();

    // Insumos listados
    expect(screen.getByText('Adubo NPK 20-05-20')).toBeInTheDocument();
    expect(screen.getByText('50 Sc')).toBeInTheDocument();
    expect(screen.getByText('Fungicida Cobrex')).toBeInTheDocument();

    // Link para recompra em 1-clique com packageId
    const reorderBtn = screen.getByTestId('btn-reorder-package-pkg-florada-1');
    expect(reorderBtn).toBeInTheDocument();
    expect(reorderBtn).toHaveAttribute('href', '/produtor/cotacoes/nova?packageId=pkg-florada-1');
  });

  it('permite excluir um pacote tecnológico', async () => {
    // Mock window.confirm para retornar true
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <AuthProvider>
        <ProducerDashboard />
      </AuthProvider>
    );

    const packagesTab = await screen.findByTestId('tab-my-packages');
    fireEvent.click(packagesTab);

    const deleteButtons = screen.getAllByTitle(/Excluir pacote/i);
    expect(deleteButtons.length).toBe(2);

    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(packageService.deletePackage).toHaveBeenCalledWith('pkg-florada-1');
    });
  });

  it('exibe estado vazio quando o produtor não tem pacotes salvos', async () => {
    vi.spyOn(packageService, 'listMyPackages').mockResolvedValue([]);

    render(
      <AuthProvider>
        <ProducerDashboard />
      </AuthProvider>
    );

    const packagesTab = await screen.findByTestId('tab-my-packages');
    fireEvent.click(packagesTab);

    await waitFor(() => {
      expect(screen.getByText(/Nenhum Pacote Tecnológico salvo ainda/i)).toBeInTheDocument();
      expect(screen.getByText(/Criar Cotação e Salvar Pacote/i)).toBeInTheDocument();
    });
  });
});
