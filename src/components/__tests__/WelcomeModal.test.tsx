import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WelcomeModal } from '../WelcomeModal';
import { ProducerProfile } from '../../types/user';

describe('WelcomeModal Component', () => {
  const mockProducer: ProducerProfile = {
    id: 'prod-modal-1',
    role: 'PRODUCER',
    name: 'Sebastião Silva',
    email: 'sebastiao@fazenda.com',
    whatsapp: '(27) 99999-3333',
    farmName: 'Fazenda Vista Alegre',
    state: 'ES',
    city: 'Linhares',
    crops: ['cafe', 'cacau'],
    createdAt: new Date().toISOString(),
  };

  it('não deve renderizar quando isOpen for false', () => {
    const { container } = render(
      <WelcomeModal isOpen={false} onClose={vi.fn()} user={mockProducer} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('deve renderizar com dados do produtor quando isOpen for true', () => {
    render(<WelcomeModal isOpen={true} onClose={vi.fn()} user={mockProducer} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Fazenda Vista Alegre/i)).toBeInTheDocument();
  });

  it('deve fechar ao clicar no botão X de fechar ou pressionar Escape', () => {
    const onCloseMock = vi.fn();
    render(<WelcomeModal isOpen={true} onClose={onCloseMock} user={mockProducer} />);

    const closeBtn = screen.getByLabelText(/Fechar modal de boas-vindas/i);
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCloseMock).toHaveBeenCalledTimes(2);
  });

  it('deve chamar onClose ao clicar em "Explorar Meu Painel"', () => {
    const onCloseMock = vi.fn();
    render(<WelcomeModal isOpen={true} onClose={onCloseMock} user={mockProducer} />);

    const exploreBtn = screen.getByRole('button', { name: /Explorar Meu Painel/i });
    fireEvent.click(exploreBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('deve acionar onCreateQuote e onClose ao clicar em "Criar Minha Primeira Cotação"', () => {
    const onCloseMock = vi.fn();
    const onCreateQuoteMock = vi.fn();
    render(
      <WelcomeModal
        isOpen={true}
        onClose={onCloseMock}
        user={mockProducer}
        onCreateQuote={onCreateQuoteMock}
      />
    );

    const createBtn = screen.getByRole('button', { name: /Criar Minha Primeira Cotação/i });
    fireEvent.click(createBtn);

    expect(onCloseMock).toHaveBeenCalled();
    expect(onCreateQuoteMock).toHaveBeenCalled();
  });

  it('deve disparar alert se onCreateQuote não for fornecido', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const onCloseMock = vi.fn();
    render(<WelcomeModal isOpen={true} onClose={onCloseMock} user={mockProducer} />);

    const createBtn = screen.getByRole('button', { name: /Criar Minha Primeira Cotação/i });
    fireEvent.click(createBtn);

    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
