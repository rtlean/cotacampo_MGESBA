import { router, publicProcedure } from '../trpc';
import {
  publishQuotationInputSchema,
  publishQuotationOutputSchema,
} from '../../shared/schemas/cotacoes';
import { whatsAppService } from '../services/notification';

export const cotacoesRouter = router({
  publish: publicProcedure
    .input(publishQuotationInputSchema)
    .output(publishQuotationOutputSchema)
    .mutation(async ({ input }) => {
      const displayCode = input.id.startsWith('COT-')
        ? input.id
        : `COT-${input.id.slice(-6).toUpperCase()}`;

      const publishedAt = new Date().toISOString();

      // Cenário 2: Execução assíncrona ("fire-and-forget") como side-effect
      // A chamada do produtor retorna imediatamente com sucesso
      let notifiedResellersCount = 0;
      try {
        const dispatchResult = whatsAppService.notifyEligibleResellersAsync(input);
        notifiedResellersCount = dispatchResult.eligibleCount;
      } catch (error) {
        // Cenário 3: Resiliência contra falhas no disparo
        // Falha no disparo nunca reverte nem impede a publicação da cotação
        console.error('[cotacoesRouter] Erro ao agendar notificações WhatsApp em background:', error);
      }

      return {
        id: input.id,
        displayCode,
        status: 'OPEN' as const,
        publishedAt,
        notifiedResellersCount,
        message: 'Cotação publicada com sucesso e revendas notificadas via WhatsApp!',
      };
    }),
});
