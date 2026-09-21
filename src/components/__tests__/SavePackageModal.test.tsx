import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SavePackageModal } from '../SavePackageModal';
import { packageService } from '../../services/package.service';

describe('SavePackageModal - Modal para Salvar Pacote Tecnológico (US17)', () => {
  const defaultItems = [
    { productName: 'NPK 20-00-20', quantity: 200, unit: 'Saco 50kg', acceptsGeneric: true },
    { productName: 'Boro Líquido 10%', quantity: 25, unit: 'Litros', acceptsGeneric: true },
    { productName: 'Sulfato de Zinco', quantity: 50, unit: 'Kg', acceptsGeneric: false },
  ];

  it('não deve renderizar nada se isOpen for false', () => {
    const { container } = render(
      <SavePackageModal
        isOpen={false}
        onClose={vi.fn()}
        cropType="Café Conilon"
        items={defaultItems}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('deve renderizar modal com título, cultura e itens quando isOpen for true', () => {
    render(
      <SavePackageModal
        isOpen={true}
        onClose={vi.fn()}
        cropType="Café Conilon"
        items={defaultItems}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Salvar como Pacote Tecnológico')).toBeInTheDocument();
    expect(screen.getByText('Café Conilon')).toBeInTheDocument();
    expect(screen.getByText('NPK 20-00-20')).toBeInTheDocument();
    expect(screen.getByText('Boro Líquido 10%')).toBeInTheDocument();
  });

  it('deve exibir erro de validação se o nome for menor que 3 caracteres', async () => {
    render(
      <SavePackageModal
        isOpen={true}
        onClose={vi.fn()}
        cropType="Café Conilon"
        items={defaultItems}
      />
    );

    const input = screen.getByLabelText(/Nome do Pacote Tecnológico/i);
    const submitBtn = screen.getByRole('button', { name: /Salvar Pacote Tecnológico/i });

    fireEvent.change(input, { target: { value: 'Ab' } });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/O nome do pacote deve conter pelo menos 3 caracteres/i)
    ).toBeInTheDocument();
  });

  it('deve salvar com sucesso e exibir mensagem "Pacote Tecnológico salvo nas suas predefinições!"', async () => {
    const createSpy = vi.spyOn(packageService, 'createPackageFromQuote').mockResolvedValueOnce({
      id: 'pkg_test_1',
      producerId: 'produtor_demo_1',
      name: 'Adubação de Florada',
      cropType: 'Café Conilon',
      itemsCount: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const onSuccess = vi.fn();
    render(
      <SavePackageModal
        isOpen={true}
        onClose={vi.fn()}
        cropType="Café Conilon"
        items={defaultItems}
        onSuccess={onSuccess}
      />
    );

    const input = screen.getByLabelText(/Nome do Pacote Tecnológico/i);
    const submitBtn = screen.getByRole('button', { name: /Salvar Pacote Tecnológico/i });

    fireEvent.change(input, { target: { value: 'Adubação de Florada' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Adubação de Florada',
          cropType: 'Café Conilon',
        })
      );
    });

    expect(
      await screen.findByText('Pacote Tecnológico salvo nas suas predefinições!')
    ).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalled();
  });
});
