import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  WhatsAppService,
  MockWhatsAppProvider,
  EvolutionWhatsAppProvider,
  formatQuotationMessage,
  sanitizePhoneNumber,
  getEvolutionConfigFromEnv,
  createDefaultWhatsAppProvider,
  ResellerContact,
  EvolutionConfig,
} from './notification';
import { PublishQuotationInput } from '../../shared/schemas/cotacoes';
import * as geoUtils from '../../utils/geo';

describe('US16 - WhatsAppService (Serviço de Notificação via WhatsApp para Revendas)', () => {
  let mockProvider: MockWhatsAppProvider;
  let service: WhatsAppService;

  const mockQuotationLinhares: PublishQuotationInput = {
    id: 'quote-us16-linhares',
    title: 'Adubação Foliar para Café',
    cropName: 'Café Conilon',
    targetCity: 'Linhares',
    targetState: 'ES',
    itemsCount: 4,
    freightType: 'CIF',
    proposalLimitHours: 48,
    appLink: 'https://cotacampo.com.br/cotacoes/quote-us16-linhares',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = new MockWhatsAppProvider();
    service = new WhatsAppService(mockProvider);
  });

  describe('Cenário 1: Formatação da mensagem e consulta de revendas no raio de cobertura', () => {
    it('deve gerar a mensagem de WhatsApp no formato padrão exato exigido na US16', () => {
      const message = formatQuotationMessage({
        cropName: 'Café Conilon',
        targetCity: 'Linhares',
        targetState: 'ES',
        itemsCount: 4,
        freightType: 'CIF',
        appLink: 'https://cotacampo.com.br/cotacoes/quote-123',
      });

      const expected =
        '🚜 Novo Pedido no CotaCampo! \n' +
        'Uma nova cotação de Café Conilon foi aberta em Linhares/ES. \n' +
        'Itens: 4 \n' +
        'Frete: CIF \n' +
        'Acesse o app para enviar sua proposta: https://cotacampo.com.br/cotacoes/quote-123';

      expect(message).toBe(expected);
    });

    it('deve formatar corretamente para diferentes culturas, frete FOB e link padrão de fallback', () => {
      const message = formatQuotationMessage({
        cropName: 'Mamão',
        targetCity: 'São Mateus',
        targetState: 'ES',
        itemsCount: 2,
        freightType: 'FOB',
        quotationId: 'quote-xyz',
      });

      expect(message).toContain('🚜 Novo Pedido no CotaCampo!');
      expect(message).toContain('Uma nova cotação de Mamão foi aberta em São Mateus/ES.');
      expect(message).toContain('Itens: 2');
      expect(message).toContain('Frete: FOB');
      expect(message).toContain('https://cotacampo.com.br/revenda/cotacoes/quote-xyz');
    });

    it('deve consultar apenas revendas ativas dentro do raio de cobertura geográfica', () => {
      const eligible = service.getEligibleResellers('Linhares', 'ES');

      // Linhares possui revenda ativa local (AgroVila) e revendas no raio (Colatina ~65km, raio 120km)
      expect(eligible.length).toBeGreaterThanOrEqual(1);

      // Não deve incluir revendas inativas
      const inativa = eligible.find((r) => r.id === 'res_inativa_1');
      expect(inativa).toBeUndefined();

      // Não deve incluir revenda de Manhuaçu/MG (> 200km) para cotação em Linhares/ES
      const manhuacu = eligible.find((r) => r.id === 'res_manhuacu_1');
      expect(manhuacu).toBeUndefined();

      // Revenda local de Linhares deve ser elegível
      const agroVila = eligible.find((r) => r.id === 'res_linhares_1');
      expect(agroVila).toBeDefined();
    });

    it('deve filtrar revendas corretamente para cotação em Minas Gerais (Manhuaçu)', () => {
      const eligible = service.getEligibleResellers('Manhuaçu', 'MG');

      const manhuacu = eligible.find((r) => r.id === 'res_manhuacu_1');
      expect(manhuacu).toBeDefined();

      const linhares = eligible.find((r) => r.id === 'res_linhares_1');
      expect(linhares).toBeUndefined();
    });
  });

  describe('Cenário 2: Execução assíncrona ("fire-and-forget") para não travar a tela do produtor', () => {
    it('deve disparar notificações em segundo plano sem bloquear a execução síncrona', async () => {
      // Configura provider lento simulando chamada externa com 300ms de latência
      const slowProvider = new MockWhatsAppProvider({ delayMs: 300 });
      service.setProvider(slowProvider);

      const startTime = Date.now();
      const result = service.notifyEligibleResellersAsync(mockQuotationLinhares);
      const elapsedTime = Date.now() - startTime;

      // O retorno deve ser imediato (< 50ms), comprovando que não aguarda os 300ms
      expect(elapsedTime).toBeLessThan(50);
      expect(result.scheduled).toBe(true);
      expect(result.eligibleCount).toBeGreaterThan(0);

      // No momento do retorno, os disparos ainda estão em voo
      expect(slowProvider.sentMessages.length).toBe(0);

      // Aguarda a finalização assíncrona em background
      await vi.waitFor(() => {
        expect(slowProvider.sentMessages.length).toBe(result.eligibleCount);
      }, { timeout: 1000 });

      // Valida que todas as mensagens enviadas continham o texto obrigatório
      for (const sent of slowProvider.sentMessages) {
        expect(sent.message).toContain('🚜 Novo Pedido no CotaCampo!');
        expect(sent.message).toContain('Café Conilon');
        expect(sent.toPhone).toMatch(/^55\d+/);
      }
    });
  });

  describe('Cenário 3: Resiliência contra falhas no disparo', () => {
    it('deve capturar falhas da API de WhatsApp silenciosamente sem lançar exceção', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Provedor que simula queda de conexão / erro 500
      const failingProvider = new MockWhatsAppProvider({
        shouldFail: true,
        failureMessage: 'Timeout na Z-API / WhatsApp Gateway',
      });
      service.setProvider(failingProvider);

      // Chamada síncrona não deve lançar
      expect(() => {
        service.notifyEligibleResellersAsync(mockQuotationLinhares);
      }).not.toThrow();

      // Aguarda processamento das Promises em background
      await vi.waitFor(() => {
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[WhatsAppService] Falha silenciosa ao notificar revenda'),
          expect.stringContaining('Timeout na Z-API')
        );
      }, { timeout: 1000 });

      errorSpy.mockRestore();
    });

    it('deve registrar individualmente falhas e sucessos parciais sem interromper a fila', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      let callCount = 0;
      const partialFailingProvider: MockWhatsAppProvider = new MockWhatsAppProvider();
      partialFailingProvider.sendMessage = vi.fn().mockImplementation(async (_payload) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Número de WhatsApp inválido');
        }
        return { success: true, messageId: `msg_${callCount}` };
      });

      const customResellers: ResellerContact[] = [
        {
          id: 'res_1',
          name: 'Revenda 1',
          companyName: 'Revenda 1',
          phone: '5527999990001',
          city: 'Linhares',
          state: 'ES',
          deliveryRadiusKm: 100,
          active: true,
        },
        {
          id: 'res_2',
          name: 'Revenda 2',
          companyName: 'Revenda 2',
          phone: '5527999990002',
          city: 'Linhares',
          state: 'ES',
          deliveryRadiusKm: 100,
          active: true,
        },
      ];

      const testService = new WhatsAppService(partialFailingProvider, customResellers);
      const outcome = await testService.dispatchMessages(customResellers, mockQuotationLinhares);

      expect(outcome.sentCount).toBe(1);
      expect(outcome.failureCount).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WhatsAppService] Falha silenciosa ao notificar revenda res_1'),
        'Número de WhatsApp inválido'
      );

      errorSpy.mockRestore();
    });
  });

  describe('MockWhatsAppProvider e métodos auxiliares', () => {
    it('deve exibir mensagem formatada no console.log durante o envio normal', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const provider = new MockWhatsAppProvider();
      const res = await provider.sendMessage({
        toPhone: '5527999998888',
        message: 'Teste de mensagem',
      });

      expect(res.success).toBe(true);
      expect(res.messageId).toBeDefined();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('🚜 [WhatsApp Mock] Mensagem disparada com sucesso!'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('5527999998888'));

      logSpy.mockRestore();
    });

    it('deve permitir obter o provedor atual via getProvider', () => {
      expect(service.getProvider()).toBe(mockProvider);
    });

    it('deve permitir atualizar os revendedores cadastrados via setResellers', () => {
      const custom: ResellerContact[] = [
        {
          id: 'custom_1',
          name: 'Custom Agro',
          companyName: 'Custom Agro LTDA',
          phone: '5527999991234',
          city: 'Colatina',
          state: 'ES',
          deliveryRadiusKm: 50,
          active: true,
        },
      ];
      service.setResellers(custom);
      const found = service.getEligibleResellers('Colatina', 'ES');
      expect(found.length).toBe(1);
      expect(found[0].id).toBe('custom_1');
    });

    it('deve fazer fallback para mesmo estado quando as coordenadas do município não forem encontradas ou houver erro no cálculo', () => {
      const geoSpy = vi.spyOn(geoUtils, 'getCityDistanceKm').mockImplementationOnce(() => {
        throw new Error('Erro de cálculo geo');
      });

      const found = service.getEligibleResellers('Linhares', 'ES');
      expect(found.length).toBeGreaterThan(0);
      for (const r of found) {
        expect(r.state).toBe('ES');
      }
      geoSpy.mockRestore();
    });

    it('deve capturar erro fatal no processamento em segundo plano de notifyEligibleResellersAsync', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(service, 'dispatchMessages').mockRejectedValueOnce(new Error('Falha catastrófica no worker'));

      service.notifyEligibleResellersAsync(mockQuotationLinhares);

      await vi.waitFor(() => {
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[WhatsAppService] Erro fatal no processamento em segundo plano'),
          expect.any(Error)
        );
      }, { timeout: 1000 });

      errorSpy.mockRestore();
    });
  });

  describe('EvolutionWhatsAppProvider - Integração Real com a Evolution API', () => {
    const validConfig: EvolutionConfig = {
      apiUrl: 'https://iconickakapo-evolution.cloudfy.live/manager',
      apiKey: 'test_evolution_secret_key',
      instanceName: 'CotaCampo',
    };

    it('deve sanitizar números de telefone garantindo o prefixo DDI 55 e apenas dígitos', () => {
      expect(sanitizePhoneNumber('(27) 99888-1001')).toBe('5527998881001');
      expect(sanitizePhoneNumber('27998881001')).toBe('5527998881001');
      expect(sanitizePhoneNumber('5527998881001')).toBe('5527998881001');
      expect(sanitizePhoneNumber('+55 (33) 98765-4321')).toBe('5533987654321');
    });

    it('deve normalizar o endpoint da API removendo /manager e barras finais', () => {
      const provider1 = new EvolutionWhatsAppProvider(validConfig);
      expect(provider1.getEndpoint()).toBe(
        'https://iconickakapo-evolution.cloudfy.live/message/sendText/CotaCampo'
      );

      const provider2 = new EvolutionWhatsAppProvider({
        apiUrl: 'https://api.evolution.com/',
        apiKey: 'key',
        instanceName: 'Instancia1',
      });
      expect(provider2.getEndpoint()).toBe(
        'https://api.evolution.com/message/sendText/Instancia1'
      );
    });

    it('deve enviar mensagem com sucesso via fetch nativo no endpoint correto (caminho feliz 200/201)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          key: { id: 'evo_msg_123456' },
        }),
      });
      global.fetch = mockFetch;

      const provider = new EvolutionWhatsAppProvider(validConfig);
      const result = await provider.sendMessage({
        toPhone: '(27) 99888-1001',
        message: 'Mensagem teste de cotação',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('evo_msg_123456');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [calledUrl, calledOptions] = mockFetch.mock.calls[0];

      expect(calledUrl).toBe(
        'https://iconickakapo-evolution.cloudfy.live/message/sendText/CotaCampo'
      );
      expect(calledOptions.method).toBe('POST');
      expect(calledOptions.headers).toEqual({
        'Content-Type': 'application/json',
        apikey: 'test_evolution_secret_key',
      });

      const parsedBody = JSON.parse(calledOptions.body);
      expect(parsedBody).toEqual({
        number: '5527998881001',
        text: 'Mensagem teste de cotação',
        options: {
          delay: 1200,
          presence: 'composing',
        },
        textMessage: {
          text: 'Mensagem teste de cotação',
        },
      });
    });

    it('deve gerar messageId de fallback se a resposta não contiver key.id', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          messageId: 'alt_msg_789',
        }),
      });
      global.fetch = mockFetch;

      const provider = new EvolutionWhatsAppProvider(validConfig);
      const result = await provider.sendMessage({
        toPhone: '5527998881002',
        message: 'Teste fallback ID',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('alt_msg_789');
    });

    it('deve tratar com segurança resposta HTTP não-ok (400 / 500) logando e lançando erro', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: 'Instância desconectada do WhatsApp' }),
      });
      global.fetch = mockFetch;

      const provider = new EvolutionWhatsAppProvider(validConfig);

      await expect(
        provider.sendMessage({
          toPhone: '5527998881003',
          message: 'Mensagem com erro 400',
        })
      ).rejects.toThrow('Evolution API HTTP 400');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Evolution API Error] Status HTTP 400 ao enviar para 5527998881003:')
      );

      errorSpy.mockRestore();
    });

    it('deve tratar falhas de conexão / rede do fetch nativo', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      global.fetch = mockFetch;

      const provider = new EvolutionWhatsAppProvider(validConfig);

      await expect(
        provider.sendMessage({
          toPhone: '5527998881004',
          message: 'Falha de rede',
        })
      ).rejects.toThrow('ECONNREFUSED');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[EvolutionWhatsAppProvider] Falha ao enviar mensagem para 5527998881004:'),
        'ECONNREFUSED'
      );

      errorSpy.mockRestore();
    });

    it('deve validar parâmetros de configuração com Zod e lançar erro para dados inválidos', () => {
      // URL inválida
      expect(() => {
        new EvolutionWhatsAppProvider({
          apiUrl: 'nao-e-uma-url',
          apiKey: 'key',
          instanceName: 'instancia',
        });
      }).toThrow();

      // ApiKey vazia
      expect(() => {
        new EvolutionWhatsAppProvider({
          apiUrl: 'https://api.com',
          apiKey: '',
          instanceName: 'instancia',
        });
      }).toThrow();

      // InstanceName vazio
      expect(() => {
        new EvolutionWhatsAppProvider({
          apiUrl: 'https://api.com',
          apiKey: 'key',
          instanceName: '',
        });
      }).toThrow();
    });

    describe('getEvolutionConfigFromEnv e createDefaultWhatsAppProvider', () => {
      const originalEnv = process.env;

      beforeEach(() => {
        process.env = { ...originalEnv };
      });

      it('deve retornar null se as variáveis de ambiente não estiverem completas', () => {
        delete process.env.EVOLUTION_API_URL;
        delete process.env.EVOLUTION_API_KEY;
        delete process.env.EVOLUTION_INSTANCE_NAME;

        expect(getEvolutionConfigFromEnv()).toBeNull();
      });

      it('deve retornar null e emitir aviso se as variáveis existirem mas forem inválidas segundo o schema Zod', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        process.env.EVOLUTION_API_URL = 'url-invalida-sem-protocolo';
        process.env.EVOLUTION_API_KEY = 'secret123';
        process.env.EVOLUTION_INSTANCE_NAME = 'InstanciaTeste';

        expect(getEvolutionConfigFromEnv()).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('[EvolutionConfig] Configuração inválida'),
          expect.any(Object)
        );
        warnSpy.mockRestore();
      });

      it('deve retornar config válida quando todas as variáveis de ambiente estiverem presentes', () => {
        process.env.EVOLUTION_API_URL = 'https://evolution.teste.com';
        process.env.EVOLUTION_API_KEY = 'secret123';
        process.env.EVOLUTION_INSTANCE_NAME = 'InstanciaTeste';

        const config = getEvolutionConfigFromEnv();
        expect(config).toEqual({
          apiUrl: 'https://evolution.teste.com',
          apiKey: 'secret123',
          instanceName: 'InstanciaTeste',
        });
      });

      it('deve retornar MockWhatsAppProvider em ambiente de teste por padrão', () => {
        process.env.NODE_ENV = 'test';
        const provider = createDefaultWhatsAppProvider();
        expect(provider).toBeInstanceOf(MockWhatsAppProvider);
      });

      it('deve retornar EvolutionWhatsAppProvider em produção quando as variáveis existirem', () => {
        process.env.NODE_ENV = 'production';
        process.env.EVOLUTION_API_URL = 'https://evolution.prod.com';
        process.env.EVOLUTION_API_KEY = 'prod-key';
        process.env.EVOLUTION_INSTANCE_NAME = 'ProdInstance';

        const provider = createDefaultWhatsAppProvider();
        expect(provider).toBeInstanceOf(EvolutionWhatsAppProvider);
      });
    });
  });
});
