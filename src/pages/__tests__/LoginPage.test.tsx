import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../App';
import { AuthProvider } from '../../context/AuthContext';

describe('US03 – Autenticação Unificada e Roteamento por Perfil', () => {
  const mockProducer = {
    id: 'prod_active_1',
    role: 'PRODUCER' as const,
    name: 'Carlos Produtor da Silva',
    email: 'carlos.silva@fazendaesperanca.com.br',
    whatsapp: '(27) 99876-5432',
    password: 'SenhaProdutor@2026',
    farmName: 'Fazenda Esperança',
    state: 'ES' as const,
    city: 'Linhares',
    crops: ['cafe' as const, 'cacau' as const],
    createdAt: new Date().toISOString(),
  };

  const mockReseller = {
    id: 'res_active_1',
    role: 'RESELLER' as const,
    razaoSocial: 'AgroNorte Insumos e Defensivos Ltda',
    nomeFantasia: 'AgroNorte Linhares',
    cnpj: '22.333.444/0001-55',
    corporateEmail: 'vendas@agronorte.com.br',
    whatsapp: '(27) 99777-8899',
    password: 'SenhaRevenda@2026',
    state: 'ES' as const,
    city: 'Linhares',
    deliveryRadiusKm: 120,
    coordinates: { lat: -19.3958, lng: -40.0644 },
    categories: ['defensivos' as const, 'fertilizantes' as const],
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('cotacampo_producers_db', JSON.stringify([mockProducer]));
    localStorage.setItem('cotacampo_resellers_db', JSON.stringify([mockReseller]));
    window.history.pushState({}, '', '/login');
  });

  it('Cenário 1: Login com perfil de Produtor e redirecionamento automático para /produtor/dashboard', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // 1. Preenche e-mail e senha corretos do Produtor
    fireEvent.change(screen.getByLabelText(/E-mail ou Telefone/i), {
      target: { value: 'carlos.silva@fazendaesperanca.com.br' },
    });
    fireEvent.change(screen.getByLabelText(/Senha/i), {
      target: { value: 'SenhaProdutor@2026' },
    });

    // 2. Clica em "Entrar"
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    // 3. Deve redirecionar automaticamente para /produtor/dashboard
    await waitFor(() => {
      expect(window.location.pathname).toBe('/produtor/dashboard');
    });

    // 4. Confirma renderização do dashboard do produtor
    await waitFor(() => {
      expect(screen.getAllByText(/Fazenda Esperança/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Linhares — ES/i)).toBeInTheDocument();
    });
  });

  it('Cenário 2: Login com perfil de Revendedor e redirecionamento automático para /revenda/dashboard', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // 1. Preenche credenciais da revenda (e-mail corporativo e senha)
    fireEvent.change(screen.getByLabelText(/E-mail ou Telefone/i), {
      target: { value: 'vendas@agronorte.com.br' },
    });
    fireEvent.change(screen.getByLabelText(/Senha/i), {
      target: { value: 'SenhaRevenda@2026' },
    });

    // 2. Clica em "Entrar"
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    // 3. Deve direcionar diretamente para /revenda/dashboard
    await waitFor(() => {
      expect(window.location.pathname).toBe('/revenda/dashboard');
    });

    // 4. Confirma renderização do dashboard da revenda
    await waitFor(() => {
      expect(screen.getAllByText(/AgroNorte Linhares/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/120 km/i)).toBeInTheDocument();
      expect(screen.getByText(/Linhares — ES/i)).toBeInTheDocument();
    });
  });

  it('Cenário 3: Rejeição de acesso com e-mail não existente e mensagem genérica segura', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/E-mail ou Telefone/i), {
      target: { value: 'usuario.inexistente@agro.com.br' },
    });
    fireEvent.change(screen.getByLabelText(/Senha/i), {
      target: { value: 'QualquerSenha123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(
        screen.getByText('E-mail/telefone ou senha incorretos.')
      ).toBeInTheDocument();
    });

    // Garante que permaneceu na tela de login
    expect(window.location.pathname).toBe('/login');
  });

  it('Cenário 3 (variação): Rejeição com senha incorreta exibindo a mesma mensagem genérica', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/E-mail ou Telefone/i), {
      target: { value: 'carlos.silva@fazendaesperanca.com.br' },
    });
    fireEvent.change(screen.getByLabelText(/Senha/i), {
      target: { value: 'SenhaErrada@000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(
        screen.getByText('E-mail/telefone ou senha incorretos.')
      ).toBeInTheDocument();
    });

    expect(window.location.pathname).toBe('/login');
  });

  it('deve permitir login usando WhatsApp (apenas dígitos ou com máscara)', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Login do Produtor pelo telefone
    fireEvent.change(screen.getByLabelText(/E-mail ou Telefone/i), {
      target: { value: '27998765432' },
    });
    fireEvent.change(screen.getByLabelText(/Senha/i), {
      target: { value: 'SenhaProdutor@2026' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/produtor/dashboard');
    });
  });

  it('deve exibir link para recuperação de senha direcionando para /recuperar-senha', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    const forgotLink = screen.getByRole('link', { name: /esqueceu sua senha\?/i });
    expect(forgotLink).toBeInTheDocument();
    expect(forgotLink).toHaveAttribute('href', '/recuperar-senha');
  });
});
