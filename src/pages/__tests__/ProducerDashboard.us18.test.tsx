import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('US18 – Recompra em 1-Clique usando Pacote Tecnológico (ProducerDashboard)', () => {
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
      id: 'pkg-pos-colheita',
      producerId: 'prod-777',
      name: 'Adubação Pós-Colheita - Conilon',
      cropType: 'Café Conilon',
      itemsCount: 2,
      createdAt: new Date('2026-09-01T10:00:00Z').toISOString(),
      updatedAt: new Date('2026-09-01T10:00:00Z').toISOString(),
      items: [
        { id: '1', packageId: 'pkg-pos-colheita', productName: 'Adubo NPK 20-05-20', quantity: 90, unit: 'Sc', acceptsGeneric: true },
        { id: '2', packageId: 'pkg-pos-colheita', productName: 'Foliar Zinco + Boro', quantity: 30, unit: 'L', acceptsGeneric: false },
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
  });

  it('Cenário 1: Na aba "Meus Pacotes", o card exibe o botão [ Cotar Novamente ] direcionando para o Wizard com packageId', async () => {
    render(
      <AuthProvider>
        <ProducerDashboard />
      </AuthProvider>
    );

    const packagesTab = await screen.findByTestId('tab-my-packages');
    fireEvent.click(packagesTab);

    // Card com o nome do pacote
    expect(screen.getByText('Adubação Pós-Colheita - Conilon')).toBeInTheDocument();

    // Botão [ Cotar Novamente ]
    const reorderBtn = screen.getByTestId('btn-reorder-package-pkg-pos-colheita');
    expect(reorderBtn).toBeInTheDocument();
    expect(reorderBtn).toHaveTextContent(/Cotar Novamente/i);
    expect(reorderBtn).toHaveAttribute('href', '/produtor/cotacoes/nova?packageId=pkg-pos-colheita');
  });
});
