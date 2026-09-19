import { describe, it, expect } from 'vitest';
import { agronomicAiService } from '../agronomic-ai.service';

describe('agronomicAiService - Assistente IA de Dimensionamento e Recomendação (US11)', () => {
  describe('Cenário 1: Cálculo automático de volume por área e cultura', () => {
    it('deve calcular volume exato para defensivo líquido em 15 ha (45 Litros) e gerar resumo explicativo', () => {
      const result = agronomicAiService.calculateDosage({
        cropId: 'cafe_conilon',
        productNameOrActive: 'Azoxistrobina 250 SC',
        areaHectares: 15,
        plantsPerHectare: 3000,
      });

      expect(result.recommendedQuantity).toBe(45);
      expect(result.recommendedUnit).toBe('L');
      expect(result.dosePerHectare).toBe(3.0);
      expect(result.doseUnit).toBe('L/ha');
      expect(result.applicationMethod).toBe('aplicação tratorada/fertirrigação');
      expect(result.explanation).toBe(
        'Dose recomendada de 3.0 L/ha para 15 ha com aplicação tratorada/fertirrigação'
      );
      expect(result.matchedCategory).toBe('Defensivos');
    });

    it('deve calcular volume exato para fertilizante em 15 ha (90 Sacas) e gerar resumo explicativo', () => {
      const result = agronomicAiService.calculateDosage({
        cropId: 'cafe_conilon',
        productNameOrActive: 'Adubo NPK 20-05-20',
        areaHectares: 15,
        plantsPerHectare: 3000,
      });

      expect(result.recommendedQuantity).toBe(90);
      expect(result.recommendedUnit).toBe('Sc');
      expect(result.dosePerHectare).toBe(6);
      expect(result.doseUnit).toBe('Sc/ha');
      expect(result.explanation).toBe(
        'Dose recomendada de 6 Sc/ha para 15 ha com aplicação tratorada/fertirrigação'
      );
      expect(result.matchedCategory).toBe('Fertilizantes');
    });

    it('deve calcular volume para defensivo em pó (Kg) em 10 ha (25 Kg)', () => {
      const result = agronomicAiService.calculateDosage({
        cropId: 'cacau',
        productNameOrActive: 'Oxicloreto de Cobre 500 WP',
        areaHectares: 10,
      });

      expect(result.recommendedQuantity).toBe(25);
      expect(result.recommendedUnit).toBe('Kg');
      expect(result.explanation).toBe(
        'Dose recomendada de 2.5 Kg/ha para 10 ha com aplicação tratorada/fertirrigação'
      );
      expect(result.matchedCategory).toBe('Defensivos');
    });

    it('deve calcular volume para corretivo (Calcário) em 20 ha (40 Toneladas)', () => {
      const result = agronomicAiService.calculateDosage({
        cropId: 'cafe_arabica',
        productNameOrActive: 'Calcário Dolomítico PRNT 85%',
        areaHectares: 20,
      });

      expect(result.recommendedQuantity).toBe(40);
      expect(result.recommendedUnit).toBe('Ton');
      expect(result.explanation).toBe(
        'Dose recomendada de 2 Ton/ha para 20 ha com aplicação tratorada/fertirrigação'
      );
      expect(result.matchedCategory).toBe('Corretivos');
    });

    it('deve lidar com áreas fracionadas de pequenos produtores (ex: 0.5 ha)', () => {
      const result = agronomicAiService.calculateDosage({
        cropId: 'pimenta_reino',
        productNameOrActive: 'Óleo Mineral Emulsionável',
        areaHectares: 0.5,
      });

      expect(result.recommendedQuantity).toBe(1.5);
      expect(result.recommendedUnit).toBe('L');
      expect(result.explanation).toBe(
        'Dose recomendada de 3.0 L/ha para 0.5 ha com aplicação tratorada/fertirrigação'
      );
    });

    it('deve utilizar fallback de área mínima segura quando valor for zero ou inválido', () => {
      const result = agronomicAiService.calculateDosage({
        cropId: 'cafe_conilon',
        productNameOrActive: 'Adubo',
        areaHectares: 0,
      });

      expect(result.recommendedQuantity).toBe(6); // 1 ha padrão * 6 Sc/ha
    });

    it('deve aceitar método de aplicação customizado', () => {
      const result = agronomicAiService.calculateDosage({
        cropId: 'cafe_conilon',
        productNameOrActive: 'Adubo NPK 20-05-20',
        areaHectares: 10,
        applicationMethod: 'pulverização aérea / drone',
      });

      expect(result.explanation).toContain('pulverização aérea / drone');
    });

    it('deve aceitar areaHectares informada como string e converter com segurança', () => {
      const result = agronomicAiService.calculateDosage({
        cropId: 'cafe_conilon',
        productNameOrActive: 'Azoxistrobina',
        areaHectares: '15' as unknown as number,
      });

      expect(result.recommendedQuantity).toBe(45);
    });
  });

  describe('Cenário 2: Alerta preventivo de restrição fitossanitária (Mamão / Pimenta)', () => {
    it('deve disparar alerta de restrição para Mamão com Clorpirifós contendo o aviso oficial', () => {
      const check = agronomicAiService.checkPhytosanitaryRestrictions('mamao', 'Clorpirifós 480 EC');

      expect(check.hasRestriction).toBe(true);
      expect(check.warningMessage).toBe(
        'Atenção: Este princípio ativo possui restrições severas de exportação para a cultura do Mamão. Deseja ver opções biológicas ou alternativas registradas de menor carência?'
      );
      expect(check.recommendedAlternative).toBeDefined();
      expect(check.recommendedAlternative?.name).toBe('Azoxistrobina 250 SC');
    });

    it('deve disparar alerta de restrição para Mamão com Mancozebe', () => {
      const check = agronomicAiService.checkPhytosanitaryRestrictions('mamao', 'Mancozeb 750 WG');

      expect(check.hasRestriction).toBe(true);
      expect(check.warningMessage).toMatch(/restrições severas de exportação para a cultura do Mamão/i);
      expect(check.recommendedAlternative?.id).toBe('prod-azoxistrobina');
    });

    it('deve disparar alerta de restrição para Mamão com Glifosato', () => {
      const check = agronomicAiService.checkPhytosanitaryRestrictions('mamao', 'Glifosato 480 SL');

      expect(check.hasRestriction).toBe(true);
      expect(check.recommendedAlternative?.id).toBe('prod-oleo-mineral');
    });

    it('deve disparar alerta de restrição para Pimenta-do-reino com Clorpirifós', () => {
      const check = agronomicAiService.checkPhytosanitaryRestrictions('pimenta_reino', 'Clorpirifós');

      expect(check.hasRestriction).toBe(true);
      expect(check.warningMessage).toMatch(/Pimenta-do-reino/i);
    });

    it('não deve disparar restrição para produtos conformes (ex: Mamão com Azoxistrobina)', () => {
      const check = agronomicAiService.checkPhytosanitaryRestrictions('mamao', 'Azoxistrobina 250 SC');
      expect(check.hasRestriction).toBe(false);
      expect(check.warningMessage).toBeUndefined();
    });

    it('não deve disparar restrição para culturas sem restrição para o ativo (ex: Café Conilon com Clorpirifós)', () => {
      const check = agronomicAiService.checkPhytosanitaryRestrictions('cafe_conilon', 'Clorpirifós 480 EC');
      expect(check.hasRestriction).toBe(false);
    });

    it('deve retornar falso quando parâmetros forem vazios ou indefinidos', () => {
      expect(agronomicAiService.checkPhytosanitaryRestrictions('', 'Mancozeb').hasRestriction).toBe(false);
      expect(agronomicAiService.checkPhytosanitaryRestrictions('mamao', '   ').hasRestriction).toBe(false);
    });
  });

  describe('matchProduct', () => {
    it('deve localizar produto por nome comercial', () => {
      const prod = agronomicAiService.matchProduct('Mancozeb 750 WG');
      expect(prod?.id).toBe('prod-mancozeb');
    });

    it('deve localizar produto por princípio ativo', () => {
      const prod = agronomicAiService.matchProduct('Azoxistrobina');
      expect(prod?.id).toBe('prod-azoxistrobina');
    });

    it('deve retornar undefined para produto desconhecido ou query vazia', () => {
      expect(agronomicAiService.matchProduct('Insumo Desconhecido XYZ')).toBeUndefined();
      expect(agronomicAiService.matchProduct('   ')).toBeUndefined();
    });
  });
});
