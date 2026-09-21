import { router } from '../trpc';
import { copilotRouter } from './copilot';
import { cotacoesRouter } from './cotacoes';

export const appRouter = router({
  copilot: copilotRouter,
  cotacoes: cotacoesRouter,
});

export type AppRouter = typeof appRouter;
