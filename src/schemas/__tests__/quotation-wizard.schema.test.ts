import { describe, it, expect } from 'vitest';
import { step1DestinationSchema, targetCropEnum } from '../quotation-wizard.schema';

describe('quotation-wizard.schema (US06 Passo 1)', () => {
  it('deve validar com sucesso quando a propriedade e a cultura forem válidas', () => {
    const validCrops = ['cafe_conilon', 'cafe_arabica', 'cacau', 'pimenta_reino', 'mamao'] as const;

    validCrops.forEach((crop) => {
      const result = step1DestinationSchema.safeParse({
        farmId: 'farm-123',
        targetCrop: crop,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.farmId).toBe('farm-123');
        expect(result.data.targetCrop).toBe(crop);
      }
    });
  });

  it('deve reprovar quando a propriedade não for informada ou for vazia', () => {
    const missingFarm = step1DestinationSchema.safeParse({
      farmId: '',
      targetCrop: 'cafe_conilon',
    });

    expect(missingFarm.success).toBe(false);
    if (!missingFarm.success) {
      expect(missingFarm.error.flatten().fieldErrors.farmId).toContain(
        'Selecione a propriedade de destino'
      );
    }

    const undefinedFarm = step1DestinationSchema.safeParse({
      targetCrop: 'cafe_conilon',
    });

    expect(undefinedFarm.success).toBe(false);
    if (!undefinedFarm.success) {
      expect(undefinedFarm.error.flatten().fieldErrors.farmId).toContain(
        'Selecione a propriedade de destino'
      );
    }
  });

  it('deve reprovar quando a cultura atendida não for informada ou for inválida', () => {
    const missingCrop = step1DestinationSchema.safeParse({
      farmId: 'farm-123',
      targetCrop: '',
    });

    expect(missingCrop.success).toBe(false);
    if (!missingCrop.success) {
      expect(missingCrop.error.flatten().fieldErrors.targetCrop).toContain(
        'Selecione a cultura atendida'
      );
    }

    const invalidCrop = step1DestinationSchema.safeParse({
      farmId: 'farm-123',
      targetCrop: 'soja',
    });

    expect(invalidCrop.success).toBe(false);
    if (!invalidCrop.success) {
      expect(invalidCrop.error.flatten().fieldErrors.targetCrop).toContain(
        'Selecione a cultura atendida'
      );
    }
  });

  it('deve validar targetCropEnum isoladamente', () => {
    expect(targetCropEnum.safeParse('cafe_conilon').success).toBe(true);
    expect(targetCropEnum.safeParse('cacau').success).toBe(true);
    const fail = targetCropEnum.safeParse('milho');
    expect(fail.success).toBe(false);
    if (!fail.success) {
      expect(fail.error.issues[0].message).toBe('Selecione a cultura atendida');
    }
  });

  describe('Passo 2 – Itens, Genéricos e Receituário (US07)', () => {
    it('deve validar um item válido com quantidade positiva e genéricos', async () => {
      const { step2ItemSchema } = await import('../quotation-wizard.schema');

      const validItem = {
        productName: 'Mancozeb 750 WG',
        activeIngredient: 'Mancozebe',
        quantity: 50,
        unit: 'Kg',
        acceptsGeneric: true,
      };

      const result = step2ItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.productName).toBe('Mancozeb 750 WG');
        expect(result.data.quantity).toBe(50);
        expect(result.data.unit).toBe('Kg');
        expect(result.data.acceptsGeneric).toBe(true);
      }
    });

    it('deve reprovar quando a quantidade for zero (0) ou negativa', async () => {
      const { step2ItemSchema } = await import('../quotation-wizard.schema');

      const zeroQty = step2ItemSchema.safeParse({
        productName: 'Mancozeb 750 WG',
        quantity: 0,
        unit: 'Kg',
      });
      expect(zeroQty.success).toBe(false);
      if (!zeroQty.success) {
        expect(zeroQty.error.flatten().fieldErrors.quantity).toContain(
          'A quantidade deve ser maior que zero (0)'
        );
      }

      const negativeQty = step2ItemSchema.safeParse({
        productName: 'Mancozeb 750 WG',
        quantity: -10,
        unit: 'Kg',
      });
      expect(negativeQty.success).toBe(false);
      if (!negativeQty.success) {
        expect(negativeQty.error.flatten().fieldErrors.quantity).toContain(
          'A quantidade deve ser maior que zero (0)'
        );
      }
    });

    it('deve reprovar nome de produto curto ou vazio e unidade vazia', async () => {
      const { step2ItemSchema } = await import('../quotation-wizard.schema');

      const emptyName = step2ItemSchema.safeParse({
        productName: '',
        quantity: 10,
        unit: 'Kg',
      });
      expect(emptyName.success).toBe(false);

      const emptyUnit = step2ItemSchema.safeParse({
        productName: 'Mancozeb',
        quantity: 10,
        unit: '',
      });
      expect(emptyUnit.success).toBe(false);
    });

    it('deve validar step2QuotationSchema com lista contendo itens válidos', async () => {
      const { step2QuotationSchema } = await import('../quotation-wizard.schema');

      const validQuotation = {
        items: [
          {
            productName: 'Mancozeb 750 WG',
            quantity: 50,
            unit: 'Kg',
            acceptsGeneric: true,
          },
        ],
        prescription: {
          name: 'receituario.pdf',
          size: 1024 * 1024,
          type: 'application/pdf',
          uploadedAt: new Date().toISOString(),
        },
      };

      const result = step2QuotationSchema.safeParse(validQuotation);
      expect(result.success).toBe(true);
    });

    it('deve reprovar lista de itens vazia em step2QuotationSchema', async () => {
      const { step2QuotationSchema } = await import('../quotation-wizard.schema');

      const emptyList = step2QuotationSchema.safeParse({
        items: [],
      });
      expect(emptyList.success).toBe(false);
      if (!emptyList.success) {
        expect(emptyList.error.flatten().fieldErrors.items).toContain(
          'Adicione ao menos um item com volume válido para continuar.'
        );
      }
    });

    it('deve validar regras do arquivo de receituário (limite 5MB e formatos aceitos)', async () => {
      const { recipeAttachmentSchema, MAX_PRESCRIPTION_SIZE_BYTES } = await import(
        '../quotation-wizard.schema'
      );

      // Arquivo válido
      const validFile = recipeAttachmentSchema.safeParse({
        name: 'receita.png',
        size: 2 * 1024 * 1024,
        type: 'image/png',
        uploadedAt: new Date().toISOString(),
      });
      expect(validFile.success).toBe(true);

      // Arquivo maior que 5MB
      const bigFile = recipeAttachmentSchema.safeParse({
        name: 'receita_pesada.pdf',
        size: MAX_PRESCRIPTION_SIZE_BYTES + 100,
        type: 'application/pdf',
        uploadedAt: new Date().toISOString(),
      });
      expect(bigFile.success).toBe(false);
      if (!bigFile.success) {
        expect(bigFile.error.flatten().fieldErrors.size).toContain(
          'O arquivo excede o limite máximo permitido de 5MB.'
        );
      }

      // Formato inválido (.exe)
      const invalidFile = recipeAttachmentSchema.safeParse({
        name: 'virus.exe',
        size: 500,
        type: 'application/x-msdownload',
        uploadedAt: new Date().toISOString(),
      });
      expect(invalidFile.success).toBe(false);
      if (!invalidFile.success) {
        expect(invalidFile.error.flatten().fieldErrors.type).toContain(
          'Formato inválido. Apenas arquivos PDF ou imagens (PNG, JPG) são permitidos.'
        );
      }
    });
  });
});
