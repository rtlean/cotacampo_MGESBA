import { describe, it, expect, vi } from 'vitest';
import { appRouter } from '../_app';
import { copilotService } from '../../services/copilot.service';

describe('copilotRouter - Procedures tRPC do Copiloto IA (US11.1)', () => {
  const caller = appRouter.createCaller({});

  describe('Cenário 2: Consulta à procedure tRPC copilot.calculateDosage com sucesso', () => {
    it('deve processar a requisição e retornar recommendedQuantity, unit, dosagePerHectare e justification', async () => {
      const response = await caller.copilot.calculateDosage({
        cropType: 'cafe_conilon',
        areaHectares: 15,
        plantCount: 3000,
        productOrActiveIngredient: 'Azoxistrobina 250 SC',
        state: 'ES',
      });

      expect(response.recommendedQuantity).toBe(45);
      expect(response.unit).toBe('Litros');
      expect(response.dosagePerHectare).toBe('3.0 L/ha');
      expect(response.justification).toContain('3.0 L/ha para 15 ha');
      expect(response.isLmrRestricted).toBe(false);
      expect(response.warningMessage).toBeUndefined();
    });

    it('deve calcular dosagem para fertilizante NPK em Minas Gerais com sucesso', async () => {
      const response = await caller.copilot.calculateDosage({
        cropType: 'cafe_arabica',
        areaHectares: 20,
        productOrActiveIngredient: 'Adubo NPK 20-05-20',
        state: 'MG',
      });

      expect(response.recommendedQuantity).toBe(120);
      expect(response.unit).toBe('Sacas');
      expect(response.dosagePerHectare).toBe('6 Sc/ha');
      expect(response.isLmrRestricted).toBe(false);
    });
  });

  describe('Cenário 3: Detecção de restrição fitossanitária para Mamão ou Pimenta', () => {
    it('deve retornar isLmrRestricted: true, warningMessage detalhado e suggestedAlternatives para Clorpirifós em Mamão', async () => {
      const response = await caller.copilot.calculateDosage({
        cropType: 'mamao',
        areaHectares: 8,
        productOrActiveIngredient: 'Clorpirifós 480 EC',
        state: 'ES',
      });

      expect(response.isLmrRestricted).toBe(true);
      expect(response.warningMessage).toContain('restrições severas de exportação para a cultura do Mamão');
      expect(response.warningMessage).toContain('Limite Máximo de Resíduo (LMR)');
      expect(response.suggestedAlternatives).toBeDefined();
      expect(response.suggestedAlternatives?.length).toBeGreaterThan(0);
      expect(response.suggestedAlternatives).toContain('Azoxistrobina 250 SC');
    });

    it('deve retornar isLmrRestricted: true para Mancozeb em Pimenta-do-reino', async () => {
      const response = await caller.copilot.calculateDosage({
        cropType: 'pimenta_reino',
        areaHectares: 4,
        productOrActiveIngredient: 'Mancozeb 750 WG',
        state: 'ES',
      });

      expect(response.isLmrRestricted).toBe(true);
      expect(response.warningMessage).toContain('Pimenta-do-reino');
      expect(response.suggestedAlternatives).toBeDefined();
    });
  });

  describe('Cenário 4: Falha de validação no input do tRPC', () => {
    it('deve rejeitar requisição com erro de validação (BAD_REQUEST) se areaHectares <= 0 sem chamar o service', async () => {
      const spyService = vi.spyOn(copilotService, 'calculateDosage');

      await expect(
        caller.copilot.calculateDosage({
          cropType: 'cafe_conilon',
          areaHectares: 0,
          productOrActiveIngredient: 'Fungicida',
          state: 'ES',
        })
      ).rejects.toThrow();

      expect(spyService).not.toHaveBeenCalled();
      spyService.mockRestore();
    });

    it('deve rejeitar requisição se areaHectares for negativa', async () => {
      const spyService = vi.spyOn(copilotService, 'calculateDosage');

      await expect(
        caller.copilot.calculateDosage({
          cropType: 'cafe_arabica',
          areaHectares: -10,
          productOrActiveIngredient: 'Adubo',
          state: 'MG',
        })
      ).rejects.toThrow();

      expect(spyService).not.toHaveBeenCalled();
      spyService.mockRestore();
    });

    it('deve rejeitar requisição se a cultura não for suportada', async () => {
      const spyService = vi.spyOn(copilotService, 'calculateDosage');

      await expect(
        caller.copilot.calculateDosage({
          cropType: 'soja' as unknown as 'cafe_conilon',
          areaHectares: 25,
          productOrActiveIngredient: 'Herbicida',
          state: 'BA',
        })
      ).rejects.toThrow();

      expect(spyService).not.toHaveBeenCalled();
      spyService.mockRestore();
    });

    it('deve rejeitar requisição se o estado não for MG, ES ou BA', async () => {
      const spyService = vi.spyOn(copilotService, 'calculateDosage');

      await expect(
        caller.copilot.calculateDosage({
          cropType: 'cafe_conilon',
          areaHectares: 10,
          productOrActiveIngredient: 'Fungicida',
          state: 'SP' as unknown as 'MG',
        })
      ).rejects.toThrow();

      expect(spyService).not.toHaveBeenCalled();
      spyService.mockRestore();
    });
  });
});
