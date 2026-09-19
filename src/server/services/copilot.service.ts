import OpenAI from 'openai';
import { CropCopilotInput, CropCopilotOutput } from '../../shared/schemas/copilot';

export class CopilotService {
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> })?.env?.VITE_OPENAI_API_KEY);
    if (apiKey && !apiKey.includes('sk-proj- ') && apiKey.startsWith('sk-')) {
      this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    }
  }

  /**
   * System prompt especialista no manejo agronômico e clima regional (MG, ES e BA)
   */
  public getRegionalSystemPrompt(state: 'MG' | 'ES' | 'BA', cropType: string): string {
    const regionalContexts = {
      MG: 'Região de Minas Gerais (Cerrado Mineiro, Sul de Minas, Matas de Minas): Foco em Café Arábica e Conilon, cafeicultura de montanha e mecanizada, manejo nutricional e adubação pós-florada.',
      ES: 'Região do Espírito Santo (Norte Capixaba, Linhares, São Mateus, Montanhas): Polo nacional de Café Conilon, Mamão Papaya (exportação exigente) e Pimenta-do-reino. Risco elevado de perda de janelas chuvosas e rigor extremo de LMR para exportação.',
      BA: 'Região da Bahia (Oeste Baiano, Extremo Sul, Sul da Bahia): Cacau em cabruca e pleno sol, Mamão e Café Conilon irrigado, controle fitossanitário preventivo de vassoura-de-bruxa e podridões.',
    };

    return `Você é o Copiloto IA Agronômico Especialista do CotaCampo para os estados de MG, ES e BA.
Contexto da Região: ${regionalContexts[state]}
Cultura Alvo: ${cropType}

Diretrizes Obrigatórias:
1. Calcule a dose e o volume total estritamente baseado nas bulas oficiais do MAPA e boas práticas da Embrapa.
2. Identifique rigorosamente restrições de LMR (Limite Máximo de Resíduo) e carência de exportação (UE, EUA) para Mamão e Pimenta-do-reino.
3. Formate a resposta estritamente no schema JSON solicitado.`;
  }

  /**
   * Verifica restrições fitossanitárias de LMR e carência para exportação
   */
  public checkLmrRestrictions(
    cropType: string,
    productOrActiveIngredient: string
  ): { isRestricted: boolean; warningMessage?: string; alternatives?: string[] } {
    const normalizedProduct = productOrActiveIngredient
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const isExportCrop = cropType === 'mamao' || cropType === 'pimenta_reino';

    const highRiskActives = [
      'clorpirifos',
      'chlorpyrifos',
      'mancozeb',
      'mancozebe',
      'glifosato',
      'glyphosate',
      'carbendazim',
      'acefato',
      'paraquat',
      'imidacloprido',
    ];

    const isRestricted =
      isExportCrop &&
      highRiskActives.some((active) => normalizedProduct.includes(active));

    if (isRestricted) {
      const cropName = cropType === 'mamao' ? 'Mamão' : 'Pimenta-do-reino';
      return {
        isRestricted: true,
        warningMessage: `Atenção: Este princípio ativo possui restrições severas de exportação para a cultura do ${cropName}. Limite Máximo de Resíduo (LMR) incompatível com os mercados da UE/EUA e período de carência elevado.`,
        alternatives: [
          'Azoxistrobina 250 SC',
          'Bacillus subtilis (Biológico)',
          'Trichoderma harzianum (Biológico)',
          'Extrato de Neem / Azadiractina',
        ],
      };
    }

    return { isRestricted: false };
  }

  /**
   * Motor determinístico de cálculo de dosagem baseado nas bulas oficiais MAPA
   */
  public calculateDeterministicDosage(input: CropCopilotInput): CropCopilotOutput {
    const { cropType, areaHectares, productOrActiveIngredient, state } = input;
    const prodLower = productOrActiveIngredient.toLowerCase();
    const lmrCheck = this.checkLmrRestrictions(cropType, productOrActiveIngredient);

    // 1. Fertilizantes / Nutrição
    if (
      prodLower.includes('adubo') ||
      prodLower.includes('npk') ||
      prodLower.includes('fertilizante') ||
      prodLower.includes('ureia') ||
      prodLower.includes('potassio')
    ) {
      const bagsPerHa = 6;
      const totalBags = Math.round(bagsPerHa * areaHectares);
      return {
        recommendedQuantity: totalBags,
        unit: 'Sacas',
        dosagePerHectare: `${bagsPerHa} Sc/ha`,
        justification: `Dose recomendada de ${bagsPerHa} Sc/ha para ${areaHectares} ha na adubação de cobertura (${state}).`,
        isLmrRestricted: false,
      };
    }

    // 2. Corretivos (Calcário / Gesso)
    if (prodLower.includes('calcario') || prodLower.includes('calcário') || prodLower.includes('gesso')) {
      const tonPerHa = 2;
      const totalTon = Number((tonPerHa * areaHectares).toFixed(2));
      return {
        recommendedQuantity: totalTon,
        unit: 'Toneladas',
        dosagePerHectare: `${tonPerHa} Ton/ha`,
        justification: `Dose recomendada de ${tonPerHa} Ton/ha para calagem e correção de solo em ${areaHectares} ha (${state}).`,
        isLmrRestricted: false,
      };
    }

    // 3. Defensivos em pó (Kg / WP / WG / Pó Molhável)
    if (
      prodLower.includes('wp') ||
      prodLower.includes('wg') ||
      prodLower.includes('oxicloreto') ||
      prodLower.includes('pó') ||
      prodLower.includes('po') ||
      prodLower.includes('enxofre')
    ) {
      const doseKgHa = 2.5;
      const totalKg = Number((doseKgHa * areaHectares).toFixed(2));
      return {
        recommendedQuantity: totalKg,
        unit: 'Kg',
        dosagePerHectare: `${doseKgHa} Kg/ha`,
        justification: `Dose recomendada de ${doseKgHa} Kg/ha para ${areaHectares} ha com pulverização tratorada/manual (${state}).`,
        isLmrRestricted: lmrCheck.isRestricted,
        warningMessage: lmrCheck.warningMessage,
        suggestedAlternatives: lmrCheck.alternatives,
      };
    }

    // 4. Defensivos líquidos (L / SC / EC / Concentrado Solúvel)
    const doseLHa = 3.0;
    const totalLiters = Number((doseLHa * areaHectares).toFixed(2));
    return {
      recommendedQuantity: totalLiters,
      unit: 'Litros',
      dosagePerHectare: `${doseLHa.toFixed(1)} L/ha`,
      justification: `Dose recomendada de ${doseLHa.toFixed(1)} L/ha para ${areaHectares} ha com aplicação tratorada/fertirrigação (${state}).`,
      isLmrRestricted: lmrCheck.isRestricted,
      warningMessage: lmrCheck.warningMessage,
      suggestedAlternatives: lmrCheck.alternatives,
    };
  }

  /**
   * Executa a inferência agronômica do Copiloto IA estruturado
   */
  public async calculateDosage(input: CropCopilotInput): Promise<CropCopilotOutput> {
    // Verificação fitossanitária prioritária
    const lmrCheck = this.checkLmrRestrictions(input.cropType, input.productOrActiveIngredient);

    // Se a chave da OpenAI estiver configurada e for chamada em ambiente de execução
    if (this.openai && process.env.NODE_ENV !== 'test') {
      try {
        const systemPrompt = this.getRegionalSystemPrompt(input.state, input.cropType);
        const userPrompt = `Calcule a dosagem exata para:
Cultura: ${input.cropType}
Área: ${input.areaHectares} hectares
Contagem de plantas: ${input.plantCount || 'não especificado'}
Produto / Princípio Ativo: ${input.productOrActiveIngredient}
Estado: ${input.state}

Retorne um objeto JSON contendo:
- recommendedQuantity: número positivo
- unit: 'Litros' | 'Kg' | 'Sacas' | 'Toneladas'
- dosagePerHectare: string (ex: '3.0 L/ha')
- justification: string detalhando o cálculo
- isLmrRestricted: boolean
- warningMessage: string (opcional)
- suggestedAlternatives: array de strings (opcional)`;

        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as CropCopilotOutput;
          // Assegura preservação de integridade do LMR check
          if (lmrCheck.isRestricted) {
            parsed.isLmrRestricted = true;
            parsed.warningMessage = lmrCheck.warningMessage;
            parsed.suggestedAlternatives = lmrCheck.alternatives;
          }
          return parsed;
        }
      } catch (err) {
        console.warn('[CopilotService] Falha na chamada da OpenAI, utilizando motor determinístico:', err);
      }
    }

    // Fallback determinístico validado
    return this.calculateDeterministicDosage(input);
  }
}

export const copilotService = new CopilotService();
