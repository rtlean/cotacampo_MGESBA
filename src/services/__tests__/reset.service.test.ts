import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetService } from '../reset.service';

describe('resetService - Limpeza Total de Dados', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('deve limpar dados cadastrados e inicializar bancos com arrays vazios', async () => {
    // Simula dados salvos
    localStorage.setItem('cotacampo_auth_user', JSON.stringify({ id: '1', role: 'PRODUCER' }));
    localStorage.setItem('cotacampo_producers_db', JSON.stringify([{ id: 'p1' }]));
    localStorage.setItem('cotacampo_resellers_db', JSON.stringify([{ id: 'r1' }]));
    localStorage.setItem('cotacampo_quotations', JSON.stringify([{ id: 'q1' }]));
    localStorage.setItem('cotacampo_technological_packages', JSON.stringify([{ id: 'pkg1' }]));
    sessionStorage.setItem('cotacampo_welcome_notice', 'true');

    await resetService.clearAllData();

    expect(localStorage.getItem('cotacampo_auth_user')).toBeNull();
    expect(localStorage.getItem('cotacampo_producers_db')).toBe('[]');
    expect(localStorage.getItem('cotacampo_resellers_db')).toBe('[]');
    expect(localStorage.getItem('cotacampo_quotations')).toBe('[]');
    expect(localStorage.getItem('cotacampo_technological_packages')).toBe('[]');
    expect(sessionStorage.getItem('cotacampo_welcome_notice')).toBeNull();
  });

  it('deve tratar exceções silenciosamente sem quebrar a execução', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage quota error');
    });

    await expect(resetService.clearAllData()).resolves.toBeUndefined();

    spy.mockRestore();
  });
});
