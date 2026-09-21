import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResetDataPage } from '../ResetDataPage';
import { AuthProvider } from '../../context/AuthContext';
import { resetService } from '../../services/reset.service';

describe('ResetDataPage - Página de Zerar Dados', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve renderizar a tela de confirmação de reset de dados', () => {
    render(
      <AuthProvider>
        <ResetDataPage />
      </AuthProvider>
    );

    expect(screen.getByText('Limpar Todos os Dados Cadastrados')).toBeInTheDocument();
    expect(screen.getByTestId('btn-confirm-reset')).toBeInTheDocument();
  });

  it('deve executar o reset e mostrar o estado de sucesso ao clicar no botão', async () => {
    const clearSpy = vi.spyOn(resetService, 'clearAllData').mockResolvedValue();

    render(
      <AuthProvider>
        <ResetDataPage />
      </AuthProvider>
    );

    const btn = screen.getByTestId('btn-confirm-reset');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText('Base de Dados Zerada!')).toBeInTheDocument();
    });

    expect(clearSpy).toHaveBeenCalled();
    expect(screen.getByTestId('btn-go-register')).toBeInTheDocument();
  });
});
