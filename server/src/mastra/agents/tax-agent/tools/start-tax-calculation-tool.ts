import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { TaxCalculationWorkflowService } from '@/mastra/workflows/tax-calculation/tax-calculation-workflow.service';
import { TOOL_IDS } from '@shared/constants/tool-ids';
import { LoggerService } from '@infrastructure/logger/logger.service';
import { injectFromContainer } from '@/app/di-container/container-helper';

export const startTaxCalculationTool = createTool({
  id: TOOL_IDS.START_TAX_CALCULATION,
  description: `Start a new tax calculation workflow. Use this tool when:
- User wants to calculate their taxes
- User wants to do a complete tax return
- User mentions they need help filing taxes
- User wants a step-by-step tax calculation process

This starts a multi-step workflow that collects:
1. Personal information (name, marital status, children, canton)
2. Tax documents (upload and OCR processing)
3. Income, deductions, and wealth data
4. Final summary with PDF generation

After starting, you'll receive the first step's requirements. Guide the user through each step.`,
  inputSchema: z.object({
    threadId: z.string().describe('The conversation thread ID'),
    message: z.string().optional().describe('Optional initial message from the user'),
  }),
  execute: async ({ threadId, message }) => {
    const logger = injectFromContainer(LoggerService);
    const workflowService = injectFromContainer(TaxCalculationWorkflowService);
    try {
      logger.log(`[StartWorkflowTool] Starting tax calculation workflow for thread: ${threadId}`);

      const status = await workflowService.startTaxCalculation(threadId, message);

      logger.log(`[StartWorkflowTool] Workflow started with status: ${status.status}`);

      if (status.status === 'suspended') {
        return {
          success: true,
          message: 'Tax calculation workflow started successfully',
          runId: status.runId,
          currentStep: status.currentStep,
          suspendPayload: status.suspendPayload,
          instructions: `Workflow started and is waiting for user input at step: ${status.currentStep}.
Ask the user to provide the required information based on the suspendPayload.`,
        };
      }

      return {
        success: true,
        message: `Workflow started with status: ${status.status}`,
        runId: status.runId,
        status: status.status,
      };

    } catch (error) {
      console.error('[StartWorkflowTool] Error:', error);
      return {
        success: false,
        message: 'Failed to start workflow',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
