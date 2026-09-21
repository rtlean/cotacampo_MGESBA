import { z } from 'zod';

export const packageItemInputSchema = z.object({
  productName: z.string().min(2, 'Nome do produto é obrigatório'),
  quantity: z.number().positive('Quantidade deve ser maior que zero'),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  acceptsGeneric: z.boolean().default(true),
});

export const createPackageFromQuoteInputSchema = z.object({
  producerId: z.string().min(1, 'ID do produtor é obrigatório'),
  name: z.string().min(3, 'Nome do pacote deve ter no mínimo 3 caracteres'),
  cropType: z.string().min(2, 'Tipo de cultura é obrigatório'),
  quoteId: z.string().optional(),
  items: z.array(packageItemInputSchema).min(1, 'O pacote deve ter pelo menos 1 item'),
});

export const listMyPackagesInputSchema = z.object({
  producerId: z.string().min(1, 'ID do produtor é obrigatório'),
});

export const getPackageItemsInputSchema = z.object({
  packageId: z.string().min(1, 'ID do pacote é obrigatório'),
});

export type PackageItemInput = z.infer<typeof packageItemInputSchema>;
export type CreatePackageFromQuoteInput = z.infer<typeof createPackageFromQuoteInputSchema>;
export type ListMyPackagesInput = z.infer<typeof listMyPackagesInputSchema>;
export type GetPackageItemsInput = z.infer<typeof getPackageItemsInputSchema>;

export interface TechnologicalPackageDTO {
  id: string;
  producerId: string;
  name: string;
  cropType: string;
  quoteId?: string;
  itemsCount: number;
  items?: PackageItemInput[];
  createdAt: string;
  updatedAt: string;
}
