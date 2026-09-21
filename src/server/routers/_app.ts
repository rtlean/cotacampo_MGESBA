import { router } from '../trpc';
import { copilotRouter } from './copilot';
import { cotacoesRouter } from './cotacoes';
import { packagesRouter } from './packages';

export const appRouter = router({
  copilot: copilotRouter,
  cotacoes: cotacoesRouter,
  packages: packagesRouter,
});

export type AppRouter = typeof appRouter;
