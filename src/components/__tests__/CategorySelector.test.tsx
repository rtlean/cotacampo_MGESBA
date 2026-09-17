import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { CategorySelector } from '../CategorySelector';
import { SupplyCategoryId } from '../../types/user';

describe('CategorySelector Component', () => {
  it('deve renderizar as 5 categorias de insumos com títulos e ícones', () => {
    render(<CategorySelector selectedCategories={[]} onChange={() => {}} />);

    expect(screen.getByRole('checkbox', { name: /Defensivos/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Fertilizantes/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Foliares/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Biológicos/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Corretivos/i })).toBeInTheDocument();
  });

  it('deve alternar a seleção via clique adicionando ou removendo categorias', () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <CategorySelector
        selectedCategories={['defensivos']}
        onChange={handleChange}
      />
    );

    // Clicar em Fertilizantes deve adicionar
    const fertBtn = screen.getByRole('checkbox', { name: /Fertilizantes/i });
    fireEvent.click(fertBtn);
    expect(handleChange).toHaveBeenCalledWith(['defensivos', 'fertilizantes']);

    // Clicar em Defensivos (já selecionado) deve remover
    const defBtn = screen.getByRole('checkbox', { name: /Defensivos/i });
    fireEvent.click(defBtn);
    expect(handleChange).toHaveBeenCalledWith([]);

    rerender(
      <CategorySelector
        selectedCategories={['defensivos', 'fertilizantes'] as SupplyCategoryId[]}
        onChange={handleChange}
      />
    );
    expect(defBtn).toHaveAttribute('aria-checked', 'true');
    expect(fertBtn).toHaveAttribute('aria-checked', 'true');
  });

  it('deve exibir mensagem de validação acessível com role=alert quando error é informado', () => {
    render(
      <CategorySelector
        selectedCategories={[]}
        onChange={() => {}}
        error="Selecione ao menos uma categoria fornecida"
      />
    );
    const alertMsg = screen.getByRole('alert');
    expect(alertMsg).toHaveTextContent('Selecione ao menos uma categoria fornecida');
  });

  it('deve encaminhar ref ao primeiro botão para possibilitar foco programático', () => {
    const buttonRef = createRef<HTMLButtonElement>();
    render(
      <CategorySelector
        ref={buttonRef}
        selectedCategories={[]}
        onChange={() => {}}
      />
    );
    expect(buttonRef.current).not.toBeNull();
    buttonRef.current?.focus();
    expect(document.activeElement).toBe(buttonRef.current);
  });
});
