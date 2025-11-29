/**
 * Tax Calculation Workflow with Human-in-the-Loop
 * Multi-step workflow that suspends for user input at each stage
 */

import { createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { WORKFLOW_IDS } from '@shared/constants/workflow';
import {
  taxCalculationWorkflowSchema
} from '@/mastra/workflows/tax-calculation/schemas/tax-calculation-workflow.schema';
import { collectPersonalInfoStep } from '@/mastra/workflows/tax-calculation/steps/collect-personal-info-step';
import { uploadDocumentsStep } from '@/mastra/workflows/tax-calculation/steps/upload-document-step';
import { reviewExtractedDataStep } from '@/mastra/workflows/tax-calculation/steps/review-extracted-data-step';
import { calculateTaxStep } from '@/mastra/workflows/tax-calculation/steps/calculate-tax-deduction-step';
import { generateSummaryStep } from '@/mastra/workflows/tax-calculation/steps/generate-summary-step';

export const taxCalculationWorkflow = createWorkflow({
  id: WORKFLOW_IDS.TAX_CALCULATION,
  inputSchema: z.object({
    threadId: z.string(),
    message: z.string().optional().nullable(),
  }),
  outputSchema: taxCalculationWorkflowSchema.summarySchema,
})
  .then(collectPersonalInfoStep)
  .then(uploadDocumentsStep)
  .then(reviewExtractedDataStep)
  .then(calculateTaxStep)
  .then(generateSummaryStep)
  .commit();
