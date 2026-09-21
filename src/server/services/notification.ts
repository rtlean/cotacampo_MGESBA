import { z } from 'zod';
import { getCityDistanceKm } from '../../utils/geo';
import { SupportedState } from '../../types/user';
import { PublishQuotationInput } from '../../shared/schemas/cotacoes';

export interface SendMessagePayload {
  toPhone: string;
  message: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IWhatsAppProvider {
  sendMessage(payload: SendMessagePayload): Promise<SendMessageResult>;
}

/**
 * Validação tipada das variáveis de ambiente da Evolution API
 */
export const evolutionEnvSchema = z.object({
  apiUrl: z.string().url('EVOLUTION_API_URL deve ser uma URL válida'),
  apiKey: z.string().min(1, 'EVOLUTION_API_KEY é obrigatória'),
  instanceName: z.string().min(1, 'EVOLUTION_INSTANCE_NAME é obrigatório'),
});

export type EvolutionConfig = z.infer<typeof evolutionEnvSchema>;

/**
 * Sanitiza o número do telefone garantindo DDI 55 e apenas dígitos
 */
export function sanitizePhoneNumber(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('55')) {
    return clean;
  }
  return `55${clean}`;
}

/**
 * Obtém as credenciais da Evolution API a partir do ambiente se configuradas
 */
export function getEvolutionConfigFromEnv(): EvolutionConfig | null {
  const apiUrl =
    process.env.EVOLUTION_API_URL ||
    (typeof import.meta !== 'undefined' &&
      (import.meta as unknown as { env?: Record<string, string> })?.env?.EVOLUTION_API_URL);
  const apiKey =
    process.env.EVOLUTION_API_KEY ||
    (typeof import.meta !== 'undefined' &&
      (import.meta as unknown as { env?: Record<string, string> })?.env?.EVOLUTION_API_KEY);
  const instanceName =
    process.env.EVOLUTION_INSTANCE_NAME ||
    (typeof import.meta !== 'undefined' &&
      (import.meta as unknown as { env?: Record<string, string> })?.env?.EVOLUTION_INSTANCE_NAME);

  if (!apiUrl || !apiKey || !instanceName) {
    return null;
  }

  const parsed = evolutionEnvSchema.safeParse({ apiUrl, apiKey, instanceName });
  if (!parsed.success) {
    console.warn('[EvolutionConfig] Configuração inválida da Evolution API:', parsed.error.format());
    return null;
  }

  return parsed.data;
}

/**
 * Provedor de integração oficial com a Evolution API via HTTP
 */
export class EvolutionWhatsAppProvider implements IWhatsAppProvider {
  private config: EvolutionConfig;
  private cleanBaseUrl: string;

  constructor(config: EvolutionConfig) {
    const validated = evolutionEnvSchema.parse(config);
    this.config = validated;
    // Normaliza URL base removendo /manager final ou barras excedentes
    this.cleanBaseUrl = validated.apiUrl.replace(/\/manager\/?$/, '').replace(/\/+$/, '');
  }

  public getEndpoint(): string {
    return `${this.cleanBaseUrl}/message/sendText/${this.config.instanceName}`;
  }

  async sendMessage(payload: SendMessagePayload): Promise<SendMessageResult> {
    const targetNumber = sanitizePhoneNumber(payload.toPhone);
    const endpoint = this.getEndpoint();

    const requestBody = {
      number: targetNumber,
      text: payload.message,
      options: {
        delay: 1200,
        presence: 'composing' as const,
      },
      textMessage: {
        text: payload.message,
      },
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.config.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        const errorMsg = `[Evolution API Error] Status HTTP ${response.status} ao enviar para ${targetNumber}: ${errorBody}`;
        console.error(errorMsg);
        throw new Error(`Evolution API HTTP ${response.status}: ${errorBody}`);
      }

      const responseData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const keyObj = responseData?.key as Record<string, unknown> | undefined;
      const messageId =
        (typeof keyObj?.id === 'string' ? keyObj.id : null) ||
        (typeof responseData?.messageId === 'string' ? responseData.messageId : null) ||
        `evo_${Date.now()}`;

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      console.error(
        `[EvolutionWhatsAppProvider] Falha ao enviar mensagem para ${targetNumber}:`,
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  }
}

/**
 * MockWhatsAppProvider para desenvolvimento e testes
 * Realiza logs formatados no terminal sem dependência de API externa
 */
export class MockWhatsAppProvider implements IWhatsAppProvider {
  public sentMessages: SendMessagePayload[] = [];
  public delayMs: number = 0;
  public shouldFail: boolean = false;
  public failureMessage: string = 'Falha na conexão com API de WhatsApp parceira';

  constructor(options?: { delayMs?: number; shouldFail?: boolean; failureMessage?: string }) {
    if (options?.delayMs !== undefined) this.delayMs = options.delayMs;
    if (options?.shouldFail !== undefined) this.shouldFail = options.shouldFail;
    if (options?.failureMessage !== undefined) this.failureMessage = options.failureMessage;
  }

  async sendMessage(payload: SendMessagePayload): Promise<SendMessageResult> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    if (this.shouldFail) {
      const errorMsg = `[WhatsApp Mock Error] ${this.failureMessage} para ${payload.toPhone}`;
      console.error(errorMsg);
      throw new Error(this.failureMessage);
    }

    this.sentMessages.push({ ...payload });

    // Exibe log formatado com emojis para visibilidade no terminal
    console.log(
      `\n🚜 [WhatsApp Mock] Mensagem disparada com sucesso!\n` +
      `📞 Destinatário: ${payload.toPhone}\n` +
      `--------------------------------------------------\n` +
      `${payload.message}\n` +
      `--------------------------------------------------\n`
    );

    return {
      success: true,
      messageId: `mock_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    };
  }
}

/**
 * Fábrica para selecionar provedor de acordo com o ambiente
 */
export function createDefaultWhatsAppProvider(): IWhatsAppProvider {
  if (process.env.NODE_ENV !== 'test') {
    const config = getEvolutionConfigFromEnv();
    if (config) {
      return new EvolutionWhatsAppProvider(config);
    }
  }
  return new MockWhatsAppProvider();
}

export interface ResellerContact {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  city: string;
  state: SupportedState;
  deliveryRadiusKm: number;
  active: boolean;
}

export interface FormatMessageParams {
  cropName: string;
  targetCity: string;
  targetState: string;
  itemsCount: number;
  freightType: string;
  appLink?: string;
  quotationId?: string;
}

/**
 * Monta o texto padrão obrigatório conforme a US16:
 * "🚜 Novo Pedido no CotaCampo! \nUma nova cotação de [Cultura] foi aberta em [Município/UF]. \nItens: [Quantidade] \nFrete: [Modalidade] \nAcesse o app para enviar sua proposta: [Link]"
 */
export function formatQuotationMessage(params: FormatMessageParams): string {
  const link = params.appLink || `https://cotacampo.com.br/revenda/cotacoes/${params.quotationId || ''}`;
  return (
    `🚜 Novo Pedido no CotaCampo! \n` +
    `Uma nova cotação de ${params.cropName} foi aberta em ${params.targetCity}/${params.targetState}. \n` +
    `Itens: ${params.itemsCount} \n` +
    `Frete: ${params.freightType} \n` +
    `Acesse o app para enviar sua proposta: ${link}`
  );
}

// Base mock inicial de revendas cadastradas na plataforma
export const DEFAULT_MOCK_RESELLERS: ResellerContact[] = [
  {
    id: 'res_linhares_1',
    name: 'AgroVila Insumos',
    companyName: 'AgroVila Comércio Agrícola LTDA',
    phone: '5527998881001',
    city: 'Linhares',
    state: 'ES',
    deliveryRadiusKm: 100,
    active: true,
  },
  {
    id: 'res_saomateus_1',
    name: 'Norte Agro Insumos',
    companyName: 'Norte Agro LTDA',
    phone: '5527998881002',
    city: 'São Mateus',
    state: 'ES',
    deliveryRadiusKm: 80,
    active: true,
  },
  {
    id: 'res_colatina_1',
    name: 'Colatina Campo & Cia',
    companyName: 'Colatina Distribuidora Agrícola',
    phone: '5527998881003',
    city: 'Colatina',
    state: 'ES',
    deliveryRadiusKm: 120,
    active: true,
  },
  {
    id: 'res_manhuacu_1',
    name: 'Café Forte Manhuaçu',
    companyName: 'Café Forte Insumos MG',
    phone: '5533998881004',
    city: 'Manhuaçu',
    state: 'MG',
    deliveryRadiusKm: 100,
    active: true,
  },
  {
    id: 'res_inativa_1',
    name: 'Revenda Inativa Demo',
    companyName: 'Inativa Agrícola',
    phone: '5527998889999',
    city: 'Linhares',
    state: 'ES',
    deliveryRadiusKm: 100,
    active: false,
  },
];

export class WhatsAppService {
  private provider: IWhatsAppProvider;
  private resellers: ResellerContact[];

  constructor(provider?: IWhatsAppProvider, customResellers?: ResellerContact[]) {
    this.provider = provider || createDefaultWhatsAppProvider();
    this.resellers = customResellers ? [...customResellers] : [...DEFAULT_MOCK_RESELLERS];
  }

  public setProvider(provider: IWhatsAppProvider): void {
    this.provider = provider;
  }

  public getProvider(): IWhatsAppProvider {
    return this.provider;
  }

  public setResellers(resellers: ResellerContact[]): void {
    this.resellers = [...resellers];
  }

  /**
   * Consulta espacial/geográfica: localiza revendas ativas cujo raio de cobertura atenda o município/UF
   */
  public getEligibleResellers(targetCity: string, targetState: SupportedState): ResellerContact[] {
    return this.resellers.filter((reseller) => {
      if (!reseller.active) return false;

      // Mesmo município e estado: cobertura garantida
      if (
        reseller.city.trim().toLowerCase() === targetCity.trim().toLowerCase() &&
        reseller.state === targetState
      ) {
        return true;
      }

      // Calcula distância estimada entre o município da revenda e o destino da cotação
      try {
        const distanceKm = getCityDistanceKm(
          reseller.city,
          reseller.state,
          targetCity,
          targetState
        );
        return distanceKm <= reseller.deliveryRadiusKm;
      } catch {
        // Se houver erro de coordenadas, inclui caso seja mesmo estado
        return reseller.state === targetState;
      }
    });
  }

  /**
   * Formata a mensagem com base nos parâmetros da cotação
   */
  public formatMessage(quotation: PublishQuotationInput): string {
    return formatQuotationMessage({
      cropName: quotation.cropName,
      targetCity: quotation.targetCity,
      targetState: quotation.targetState,
      itemsCount: quotation.itemsCount,
      freightType: quotation.freightType,
      appLink: quotation.appLink,
      quotationId: quotation.id,
    });
  }

  /**
   * Disparo síncrono/controlado (para testes e cenários com await explícito)
   */
  public async dispatchMessages(
    resellers: ResellerContact[],
    quotation: PublishQuotationInput,
    overrideProvider?: IWhatsAppProvider
  ): Promise<{ sentCount: number; failureCount: number }> {
    const provider = overrideProvider || this.provider;
    const message = this.formatMessage(quotation);
    let sentCount = 0;
    let failureCount = 0;

    const results = await Promise.allSettled(
      resellers.map(async (reseller) => {
        try {
          await provider.sendMessage({
            toPhone: reseller.phone,
            message,
          });
          return true;
        } catch (err) {
          // Cenário 3: Resiliência contra falhas no disparo
          // O erro deve ser registrado silenciosamente nos logs do servidor para auditoria
          console.error(
            `[WhatsAppService] Falha silenciosa ao notificar revenda ${reseller.id} (${reseller.phone}):`,
            err instanceof Error ? err.message : err
          );
          throw err;
        }
      })
    );

    for (const res of results) {
      if (res.status === 'fulfilled') {
        sentCount++;
      } else {
        failureCount++;
      }
    }

    return { sentCount, failureCount };
  }

  /**
   * Cenário 2: Execução assíncrona ("fire-and-forget")
   * Dispara a notificação em segundo plano sem travar o event loop ou o retorno ao produtor
   */
  public notifyEligibleResellersAsync(
    quotation: PublishQuotationInput,
    options?: { provider?: IWhatsAppProvider }
  ): { scheduled: boolean; eligibleCount: number } {
    const eligible = this.getEligibleResellers(quotation.targetCity, quotation.targetState);

    // Dispara em background (Promise desatrelada / fire-and-forget)
    void this.dispatchMessages(eligible, quotation, options?.provider).catch((err) => {
      // Falhas no processo geral de background são capturadas aqui sem afetar a cotação
      console.error('[WhatsAppService] Erro fatal no processamento em segundo plano:', err);
    });

    return { scheduled: true, eligibleCount: eligible.length };
  }
}

export const whatsAppService = new WhatsAppService();
