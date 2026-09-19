import { router, publicProcedure } from '../trpc';
import { cropCopilotInputSchema, cropCopilotOutputSchema } from '../../shared/schemas/copilot';
import { copilotService } from '../services/copilot.service';

export const copilotRouter = router({
  calculateDosage: publicProcedure
    .input(cropCopilotInputSchema)
    .output(cropCopilotOutputSchema)
    .mutation(async ({ input }) => {
      return await copilotService.calculateDosage(input);
    }),
});
