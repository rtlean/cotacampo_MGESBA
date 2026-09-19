import { router } from '../trpc';
import { copilotRouter } from './copilot';

export const appRouter = router({
  copilot: copilotRouter,
});

export type AppRouter = typeof appRouter;
