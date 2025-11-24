// Create Mastra instance with storage and workflows
import { Mastra } from '@mastra/core';
import { taxCalculationWorkflow } from '@/mastra/workflows/tax-calculation/tax-calculation-workflow';
import { workflowStorage } from '@/mastra/storage/workflow-storage';

export const mastra = new Mastra({
  storage: workflowStorage,
  workflows: {
    taxCalculation: taxCalculationWorkflow,
  },
});
