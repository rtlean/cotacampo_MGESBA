import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../App';
import { AuthProvider } from '../../context/AuthContext';

describe('US02 – Cadastro da Revenda de Insumos', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, '', '/cadastro');
  });

  it('deve alternar para o formulário de Revenda PJ ao selecionar "Sou Revenda / Loja"', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    const resellerTab = screen.getByRole('button', { name: /Sou Revenda/i });
    fireEvent.click(resellerTab);

    expect(screen.getByLabelText(/Razão Social/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome Fantasia/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CNPJ/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Raio de Entrega/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Criar Conta de Revenda/i })).toBeInTheDocument();
  });

  it('deve aplicar máscara de CNPJ enquanto o usuário digita', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Sou Revenda/i }));

    const cnpjInput = screen.getByLabelText(/CNPJ/i) as HTMLInputElement;
    fireEvent.change(cnpjInput, { target: { value: '11222' } });
    expect(cnpjInput.value).toBe('11.222');

    fireEvent.change(cnpjInput, { target: { value: '11222333000181' } });
    expect(cnpjInput.value).toBe('11.222.333/0001-81');
  });

  it('Cenário 1: Cadastro PJ com validação, geolocalização base e raio de entrega definidos', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // 1. Seleciona "Sou Revenda de Insumos"
    fireEvent.click(screen.getByRole('button', { name: /Sou Revenda/i }));

    // 2. Preenche dados da empresa
    fireEvent.change(screen.getByLabelText(/Razão Social/i), {
      target: { value: 'AgroVila Insumos Agrícolas Ltda' },
    });
    fireEvent.change(screen.getByLabelText(/Nome Fantasia/i), {
      target: { value: 'AgroVila Linhares' },
    });
    fireEvent.change(screen.getByLabelText(/CNPJ/i), {
      target: { value: '11.222.333/0001-81' },
    });
    fireEvent.change(screen.getByLabelText(/E-mail Corporativo/i), {
      target: { value: 'contato@agrovilainsumos.com.br' },
    });
    fireEvent.change(screen.getByLabelText(/Telefone \/ WhatsApp/i), {
      target: { value: '27998887766' },
    });
    fireEvent.change(screen.getByLabelText(/Senha de Acesso/i), {
      target: { value: 'SenhaForte@2026' },
    });

    // 3. Seleciona Estado (ES), Município base (Linhares) e Raio de Entrega (100 km)
    fireEvent.change(screen.getByLabelText(/Estado \(UF\)/i), {
      target: { value: 'ES' },
    });
    fireEvent.change(screen.getByLabelText(/Município da Loja Física/i), {
      target: { value: 'Linhares' },
    });
    fireEvent.change(screen.getByLabelText(/Raio de Entrega/i), {
      target: { value: '100' },
    });

    // 4. Seleciona categorias comercializadas (Defensivos e Fertilizantes)
    fireEvent.click(screen.getByRole('checkbox', { name: /Defensivos/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Fertilizantes/i }));

    // 5. Clica em "Criar Conta de Revenda"
    fireEvent.click(screen.getByRole('button', { name: /Criar Conta de Revenda/i }));

    // 6. Deve ser redirecionado para /revenda/dashboard
    await waitFor(() => {
      expect(window.location.pathname).toBe('/revenda/dashboard');
    });

    // 7. Confirma dados da revenda no dashboard
    await waitFor(
      () => {
        expect(screen.getAllByText(/AgroVila Linhares/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/100 km/i)).toBeInTheDocument();
        expect(screen.getByText(/Linhares — ES/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('Cenário 2: Cadastro rejeitado por CNPJ duplicado com link de redirecionamento para login', async () => {
    // Pré-registra uma conta ativa com o CNPJ
    const existingAccounts = [
      {
        id: 'rev_existing_1',
        role: 'RESELLER',
        cnpj: '11.222.333/0001-81',
        nomeFantasia: 'Revenda Pioneira',
      },
    ];
    localStorage.setItem('cotacampo_resellers_db', JSON.stringify(existingAccounts));

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Seleciona perfil Revenda
    fireEvent.click(screen.getByRole('button', { name: /Sou Revenda/i }));

    // Preenche formulário com o CNPJ já existente
    fireEvent.change(screen.getByLabelText(/Razão Social/i), {
      target: { value: 'Nova Filial Insumos Ltda' },
    });
    fireEvent.change(screen.getByLabelText(/Nome Fantasia/i), {
      target: { value: 'Nova Filial' },
    });
    fireEvent.change(screen.getByLabelText(/CNPJ/i), {
      target: { value: '11.222.333/0001-81' },
    });
    fireEvent.change(screen.getByLabelText(/E-mail Corporativo/i), {
      target: { value: 'nova@filial.com.br' },
    });
    fireEvent.change(screen.getByLabelText(/Telefone \/ WhatsApp/i), {
      target: { value: '27999998888' },
    });
    fireEvent.change(screen.getByLabelText(/Senha de Acesso/i), {
      target: { value: 'Senha@2026' },
    });
    fireEvent.change(screen.getByLabelText(/Estado \(UF\)/i), {
      target: { value: 'ES' },
    });
    fireEvent.change(screen.getByLabelText(/Município da Loja Física/i), {
      target: { value: 'Colatina' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /Defensivos/i }));

    // Submete
    fireEvent.click(screen.getByRole('button', { name: /Criar Conta de Revenda/i }));

    // Deve impedir a criação e exibir a mensagem exata do cenário
    await waitFor(() => {
      expect(
        screen.getByText(/Este CNPJ já está cadastrado\. Faça login ou recupere o acesso\./i)
      ).toBeInTheDocument();
    });

    // Deve conter link para /login
    const loginLink = screen.getByRole('link', { name: /Faça login/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });
});
