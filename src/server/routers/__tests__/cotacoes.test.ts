import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from '../_app';
import { whatsAppService, MockWhatsAppProvider } from '../../services/notification';

describe('cotacoesRouter - Procedures tRPC de Cotações (US16)', () => {
  const caller = appRouter.createCaller({});
  let mockProvider: MockWhatsAppProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = new MockWhatsAppProvider();
    whatsAppService.setProvider(mockProvider);
  });

  describe('Cenário 1: Publicação com sucesso e notificação de revendas elegíveis', () => {
    it('deve publicar a cotação com status OPEN e disparar as notificações em background', async () => {
      const result = await caller.cotacoes.publish({
        id: 'quote-pub-1',
        title: 'Cotação de Fertilizantes e Defensivos',
        cropName: 'Café Conilon',
        targetCity: 'Linhares',
        targetState: 'ES',
        itemsCount: 3,
        freightType: 'CIF',
        proposalLimitHours: 48,
        appLink: 'https://cotacampo.com.br/cotacoes/quote-pub-1',
      });

      expect(result.status).toBe('OPEN');
      expect(result.id).toBe('quote-pub-1');
      expect(result.displayCode).toContain('COT-');
      expect(result.notifiedResellersCount).toBeGreaterThan(0);
      expect(result.message).toContain('Cotação publicada com sucesso');

      // Aguarda execução em background
      await vi.waitFor(() => {
        expect(mockProvider.sentMessages.length).toBe(result.notifiedResellersCount);
      }, { timeout: 1000 });

      // Garante que o texto padrão foi enviado para o WhatsApp
      const firstMsg = mockProvider.sentMessages[0];
      expect(firstMsg.message).toContain('🚜 Novo Pedido no CotaCampo!');
      expect(firstMsg.message).toContain('Café Conilon');
      expect(firstMsg.message).toContain('Linhares/ES');
      expect(firstMsg.message).toContain('Itens: 3');
      expect(firstMsg.message).toContain('Frete: CIF');
    });

    it('deve publicar cotação com displayCode pré-existente sem alterá-lo', async () => {
      const result = await caller.cotacoes.publish({
        id: 'COT-889900',
        title: 'Pedido de Insumos para Pimenta',
        cropName: 'Pimenta-do-reino',
        targetCity: 'São Mateus',
        targetState: 'ES',
        itemsCount: 5,
        freightType: 'FOB',
      });

      expect(result.displayCode).toBe('COT-889900');
      expect(result.status).toBe('OPEN');
    });
  });

  describe('Cenário 2: Execução assíncrona ("fire-and-forget") que não trava o retorno da procedure', () => {
    it('deve responder à requisição do produtor imediatamente mesmo com provider com alta latência', async () => {
      const slowProvider = new MockWhatsAppProvider({ delayMs: 400 });
      whatsAppService.setProvider(slowProvider);

      const start = Date.now();
      const response = await caller.cotacoes.publish({
        id: 'quote-slow-test',
        title: 'Cotação Rápida Produtor',
        cropName: 'Mamão',
        targetCity: 'Linhares',
        targetState: 'ES',
        itemsCount: 1,
        freightType: 'CIF',
      });
      const duration = Date.now() - start;

      // Retorno imediato para a tela do produtor (< 80ms)
      expect(duration).toBeLessThan(80);
      expect(response.status).toBe('OPEN');

      // No momento do retorno, as mensagens ainda não terminaram o delay de 400ms
      expect(slowProvider.sentMessages.length).toBe(0);

      // Aguarda a finalização em background
      await vi.waitFor(() => {
        expect(slowProvider.sentMessages.length).toBe(response.notifiedResellersCount);
      }, { timeout: 1500 });
    });
  });

  describe('Cenário 3: Resiliência contra falhas no disparo', () => {
    it('não deve quebrar a publicação da cotação se o serviço de WhatsApp lançar exceção', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const failingProvider = new MockWhatsAppProvider({
        shouldFail: true,
        failureMessage: 'Falha 503 Service Unavailable no Gateway WhatsApp',
      });
      whatsAppService.setProvider(failingProvider);

      // A procedure deve completar com sucesso sem propagar erro para o produtor
      const response = await caller.cotacoes.publish({
        id: 'quote-resilience-test',
        title: 'Cotação Resiliente',
        cropName: 'Cacau',
        targetCity: 'Linhares',
        targetState: 'ES',
        itemsCount: 2,
        freightType: 'CIF',
      });

      expect(response.status).toBe('OPEN');
      expect(response.id).toBe('quote-resilience-test');

      // Aguarda registro silencioso do erro no log de auditoria
      await vi.waitFor(() => {
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[WhatsAppService] Falha silenciosa ao notificar revenda'),
          expect.stringContaining('Falha 503')
        );
      }, { timeout: 1000 });

      errorSpy.mockRestore();
    });

    it('deve registrar erro caso ocorra exceção ao iniciar o agendamento em background', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const spyAsync = vi
        .spyOn(whatsAppService, 'notifyEligibleResellersAsync')
        .mockImplementationOnce(() => {
          throw new Error('Falha de alocação de memória na fila');
        });

      const response = await caller.cotacoes.publish({
        id: 'quote-crash-scheduler',
        title: 'Cotação Teste Scheduler',
        cropName: 'Café Arábica',
        targetCity: 'Manhuaçu',
        targetState: 'MG',
        itemsCount: 3,
        freightType: 'CIF',
      });

      // Publicação se mantém preservada
      expect(response.status).toBe('OPEN');
      expect(response.notifiedResellersCount).toBe(0);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[cotacoesRouter] Erro ao agendar notificações WhatsApp'),
        expect.any(Error)
      );

      spyAsync.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('Validação de Input (Zod / tRPC)', () => {
    it('deve rejeitar cotação com itensCount <= 0', async () => {
      await expect(
        caller.cotacoes.publish({
          id: 'quote-invalid-items',
          title: 'Cotação Inválida',
          cropName: 'Café',
          targetCity: 'Linhares',
          targetState: 'ES',
          itemsCount: 0,
          freightType: 'CIF',
        })
      ).rejects.toThrow();
    });

    it('deve rejeitar cotação com targetState inválido', async () => {
      await expect(
        caller.cotacoes.publish({
          id: 'quote-invalid-state',
          title: 'Cotação Inválida',
          cropName: 'Café',
          targetCity: 'São Paulo',
          // @ts-expect-error teste de estado não suportado
          targetState: 'SP',
          itemsCount: 1,
          freightType: 'CIF',
        })
      ).rejects.toThrow();
    });
  });
});
