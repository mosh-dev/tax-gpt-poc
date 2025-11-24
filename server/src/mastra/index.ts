import { Mastra } from '@mastra/core';
import { taxCalculationWorkflow } from '@/mastra/workflows/tax-calculation/tax-calculation-workflow';
import { workflowStorage } from '@/mastra/storage/workflow-storage';
import { getOrCreateTaxAgent } from '@/mastra/agents/tax-agent/tax-agent.handler';
import { PinoLogger } from '@mastra/loggers';
import { Observability } from '@mastra/observability';
import { connectDatabase } from '@config/database';
import { initializeLLMClient } from '@config/llm';
import { runAllSeeds } from '@/seeds/run-seed';

console.log('[Mastra] Initializing Mastra module...');

// Ensure database is connected and seeded before initializing agent
await connectDatabase();
await runAllSeeds();
await initializeLLMClient();

// Initialize tax agent (this will query the database)
const taxAgentWrapper = await getOrCreateTaxAgent();

export const mastra = new Mastra({
  agents: { taxAgent: taxAgentWrapper.agent },
  storage: workflowStorage,
  workflows: {
    taxCalculation: taxCalculationWorkflow,
  },
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    default: { enabled: true },
  }),
});

console.log('[Mastra] Mastra instance initialized successfully');
