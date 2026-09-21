import { router, publicProcedure } from '../trpc';
import {
  createPackageFromQuoteInputSchema,
  listMyPackagesInputSchema,
  getPackageItemsInputSchema,
} from '../../shared/schemas/packages';
import { packageService } from '../../services/package.service';
import { TRPCError } from '@trpc/server';

export const packagesRouter = router({
  /**
   * Cria um Pacote Tecnológico a partir dos itens de uma cotação (AWARDED ou Wizard)
   */
  createFromQuote: publicProcedure
    .input(createPackageFromQuoteInputSchema)
    .mutation(async ({ input }) => {
      const created = await packageService.createPackageFromQuote(input);
      return created;
    }),

  /**
   * Lista todos os pacotes tecnológicos pertencentes ao produtor
   */
  listMyPackages: publicProcedure
    .input(listMyPackagesInputSchema)
    .query(async ({ input }) => {
      const list = await packageService.listMyPackages(input.producerId);
      return list;
    }),

  /**
   * Busca os detalhes e itens de um pacote específico por ID
   */
  getPackageItems: publicProcedure
    .input(getPackageItemsInputSchema)
    .query(async ({ input }) => {
      const pkg = await packageService.getPackageById(input.packageId);
      if (!pkg) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Pacote com ID "${input.packageId}" não encontrado.`,
        });
      }
      return {
        package: pkg,
        items: pkg.items || [],
      };
    }),
});
