import { createStep } from '@mastra/core/workflows';
import { WORKFLOW_STEPS } from '@shared/constants/workflow';
import { z } from 'zod';
import {
  taxCalculationWorkflowSchema
} from '@/mastra/workflows/tax-calculation/schemas/tax-calculation-workflow.schema';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { AgentLoggerService } from '@infrastructure/ai/agent-logger.service';

/**
 * Step 1: Collect Personal Information
 * Suspends to wait for user to provide their personal details
 */
export const collectPersonalInfoStep = createStep({
  id: WORKFLOW_STEPS.COLLECT_PERSONAL_INFO,
  inputSchema: z.object({
    threadId: z.string(),
    message: z.string().optional().nullable(),
  }),
  outputSchema: taxCalculationWorkflowSchema.personalInfoSchema,
  resumeSchema: taxCalculationWorkflowSchema.personalInfoSchema,
  suspendSchema: z.object({
    reason: z.string(),
    requiredFields: z.array(z.string()),
  }),
  execute: async ({ resumeData, suspend }) => {
    const logger = injectFromContainer(AgentLoggerService);
    if (resumeData) {
      logger.info(resumeData, '[Workflow] Personal info received');
      return resumeData;
    }

    // Suspend and wait for user input
    logger.info('[Workflow] Suspending for personal info collection');
    return await suspend({
      reason: 'Please provide your personal information to begin tax calculation',
      requiredFields: [
        'firstName',
        'lastName',
        'maritalStatus',
        'numberOfChildren',
        'taxYear',
      ],
    });
  },
});
