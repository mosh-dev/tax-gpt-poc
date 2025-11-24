// Create Mastra instance with storage and workflows
import { Mastra } from '@mastra/core';
import { taxCalculationWorkflow } from '@/mastra/workflows/tax-calculation/tax-calculation-workflow';
import { workflowStorage } from '@/mastra/storage/workflow-storage';
import { getOrCreateTaxAgent } from '@/mastra/agents/tax-agent/tax-agent.handler';

const taxAgentWrapper = await getOrCreateTaxAgent();

export const mastra = new Mastra({
  agents: {taxAgent: taxAgentWrapper.agent},
  storage: workflowStorage,
  workflows: {
    taxCalculation: taxCalculationWorkflow,
  },
});
