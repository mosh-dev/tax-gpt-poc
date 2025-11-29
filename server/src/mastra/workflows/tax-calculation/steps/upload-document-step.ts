import { WORKFLOW_STEPS } from '@shared/constants/workflow';
import { createStep } from '@mastra/core/workflows';
import {
  taxCalculationWorkflowSchema
} from '@/mastra/workflows/tax-calculation/schemas/tax-calculation-workflow.schema';
import { z } from 'zod';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { AgentLoggerService } from '@infrastructure/ai/agent-logger.service';

/**
 * Step 2: Upload Documents
 * Suspends to wait for user to upload their tax documents
 */
export const uploadDocumentsStep = createStep({
  id: WORKFLOW_STEPS.UPLOAD_DOCUMENTS,
  inputSchema: taxCalculationWorkflowSchema.personalInfoSchema,
  outputSchema: z.object({
    personalInfo: taxCalculationWorkflowSchema.personalInfoSchema,
    documents: taxCalculationWorkflowSchema.documentSchema.shape.documents,
  }),
  resumeSchema: taxCalculationWorkflowSchema.documentSchema,
  suspendSchema: z.object({
    reason: z.string(),
    acceptedFormats: z.array(z.string()),
    suggestedDocuments: z.array(z.string()),
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    const logger = injectFromContainer(AgentLoggerService);
    if (resumeData && resumeData.documents.length > 0) {
      logger.info(`[Workflow] Documents received: ${resumeData.documents.length}`);
      return {
        personalInfo: inputData,
        documents: resumeData.documents,
      };
    }

    // Suspend and wait for document upload
    logger.info('[Workflow] Suspending for document upload');
    return await suspend({
      reason: 'Please upload your tax documents for processing',
      acceptedFormats: ['PDF', 'JPG', 'PNG', 'TIFF'],
      suggestedDocuments: [
        'Lohnausweis (Salary certificate)',
        'Bank statements',
        'Insurance certificates',
        'Pillar 3a confirmation',
        'Donation receipts',
        'Professional expense receipts',
      ],
    });
  },
});
