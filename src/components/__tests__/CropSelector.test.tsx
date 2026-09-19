import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { CropSelector } from '../CropSelector';

describe('CropSelector Component', () => {
  it('deve renderizar as culturas agrícolas atendidas com seus nomes e ícones', () => {
    render(<CropSelector selectedCrops={[]} onChange={() => {}} />);

    expect(screen.getByRole('checkbox', { name: /Café Conilon/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Café Arábica/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Cacau/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Pimenta-do-reino/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Mamão/i })).toBeInTheDocument();
  });

  it('deve alternar a seleção via clique adicionando ou removendo culturas', () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <CropSelector selectedCrops={['cafe_conilon']} onChange={handleChange} />
    );

    // Clicar em Pimenta deve chamar onChange com ['cafe_conilon', 'pimenta']
    const pimentaBtn = screen.getByRole('checkbox', { name: /Pimenta-do-reino/i });
    fireEvent.click(pimentaBtn);
    expect(handleChange).toHaveBeenCalledWith(['cafe_conilon', 'pimenta']);

    // Clicar em Café Conilon (já selecionado) deve chamar onChange removendo-o
    const cafeBtn = screen.getByRole('checkbox', { name: /Café Conilon/i });
    fireEvent.click(cafeBtn);
    expect(handleChange).toHaveBeenCalledWith([]);

    // Rerender com nova lista
    rerender(<CropSelector selectedCrops={['cafe_conilon', 'pimenta']} onChange={handleChange} />);
    expect(cafeBtn).toHaveAttribute('aria-checked', 'true');
    expect(pimentaBtn).toHaveAttribute('aria-checked', 'true');
  });

  it('deve exibir mensagem de validação acessível com role=alert quando error é informado', () => {
    render(
      <CropSelector
        selectedCrops={[]}
        onChange={() => {}}
        error="Selecione ao menos uma cultura atendida"
      />
    );
    const alertMsg = screen.getByRole('alert');
    expect(alertMsg).toHaveTextContent('Selecione ao menos uma cultura atendida');
  });

  it('deve encaminhar ref ao primeiro botão para possibilitar foco programático', () => {
    const buttonRef = createRef<HTMLButtonElement>();
    render(
      <CropSelector
        ref={buttonRef}
        selectedCrops={[]}
        onChange={() => {}}
      />
    );
    expect(buttonRef.current).not.toBeNull();
    buttonRef.current?.focus();
    expect(document.activeElement).toBe(buttonRef.current);
  });
});
