import { Mastra } from '@mastra/core';
import { taxCalculationWorkflow } from '@/mastra/workflows/tax-calculation/tax-calculation-workflow';
import { workflowStorage } from '@/mastra/storage/workflow-storage';
import { getOrCreateTaxAgent } from '@/mastra/agents/tax-agent/tax-agent.handler';
import { PinoLogger } from '@mastra/loggers';
import { Observability } from '@mastra/observability';
import { setMastra } from '@/mastra/mastra-instance';
import { env } from '@config/env';
import { createExpressApp } from '@/express-app';

const isMastraPlayground = env.MASTRA_START_SERVER;

// Conditionally start Express server when running in Mastra dev mode
// Uses a custom port (3001) to avoid conflict with Mastra playground
if (isMastraPlayground) {
  console.log('[Mastra] MASTRA_START_SERVER flag detected, starting Express server...');

  try {
    const app = await createExpressApp();

    // Use SERVER_PORT from environment (defaults to PORT if not set)
    const serverPort = env.SERVER_PORT;
    const baseUrl = env.BASE_URL;

    app.listen(serverPort, () => {
      console.log(`\n`);
      console.log(`[Express Server] Environment: ${env.NODE_ENV}`);
      console.log(`[Express Server] Port: ${serverPort}`);
      console.log(`[Express Server] API: ${baseUrl}/api`);
      console.log(`[Express Server] Health: ${baseUrl}/api/health`);
      console.log(`[Express Server] Files: ${baseUrl}/files`);
      console.log(`\n`);
    });

    console.log(`[Mastra] Express server started successfully on port ${serverPort} alongside Mastra playground`);
  } catch (error) {
    console.error('[Mastra] Failed to start Express server:', error);
    console.error('[Mastra] Mastra playground will continue without Express server');
  }
}


console.log('[Mastra] Initializing Mastra module...');

// Initialize tax agent
const taxAgentWrapper = await getOrCreateTaxAgent();

export const mastra = new Mastra({
  agents: {taxAgent: taxAgentWrapper.agent},
  storage: workflowStorage,
  workflows: {
    taxCalculation: taxCalculationWorkflow,
  },
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    default: {enabled: true},
  }),
});

// Register the mastra instance for use elsewhere (breaks circular dependencies)
setMastra(mastra);

console.log('[Mastra] Mastra instance initialized successfully');
