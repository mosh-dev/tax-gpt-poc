/**
 * Resume Workflow Tool
 * Mastra tool for resuming suspended workflows
 * Called by AI agent to continue workflow steps
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { TOOL_IDS } from '@shared/constants/tool-ids';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { TaxCalculationWorkflowService } from '@/mastra/workflows/tax-calculation/tax-calculation-workflow.service';
import { AgentLoggerService } from '@infrastructure/ai/agent-logger.service';

export const resumeTaxCalculationTool = createTool({
  id: TOOL_IDS.RESUME_TAX_CALCULATION,
  description: `Resume a suspended tax calculation workflow with user data. Use this tool when:
- User has provided their personal information (firstName, lastName, maritalStatus, etc.)
- User has uploaded documents
- User has confirmed extracted tax data
- User wants to generate PDF summary

The workflow progresses through these steps in order:
1. collect-personal-info - User provides name, marital status, children, canton, tax year
2. upload-documents - User uploads tax documents (Lohnausweis, receipts, etc.)
3. review-extracted-data - User reviews and confirms extracted income/deductions/wealth
4. generate-summary - User confirms to finish or generate PDF

Always check what step the workflow is currently on before resuming.`,
  inputSchema: z.object({
    runId: z.string().describe('The workflow run ID'),
    stepId: z.string().describe('The current step ID to resume (e.g., collect-personal-info, upload-documents)'),
    data: z.any().describe('The data for this step. Structure depends on the step type.'),
  }),
  execute: async ({ runId, stepId, data }) => {
    const logger = injectFromContainer(AgentLoggerService);
    const workflowService = injectFromContainer(TaxCalculationWorkflowService);

    try {
      logger.info(`[ResumeWorkflowTool] Resuming workflow ${runId} at step ${stepId}`);
      logger.info(data, `[ResumeWorkflowTool] Data:`);

      const status = await workflowService.resumeWorkflow(runId, stepId, data);

      logger.info(`[ResumeWorkflowTool] Workflow status: ${status.status}`);

      if (status.status === 'completed') {
        return {
          success: true,
          completed: true,
          message: 'Workflow completed successfully!',
          result: status.result,
        };
      }

      if (status.status === 'suspended') {
        return {
          success: true,
          completed: false,
          message: `Workflow advanced to step: ${status.currentStep}`,
          nextStep: status.currentStep,
          suspendPayload: status.suspendPayload,
          runId: status.runId,
        };
      }

      if (status.status === 'failed') {
        return {
          success: false,
          message: `Workflow failed: ${status.error}`,
          error: status.error,
        };
      }

      return {
        success: true,
        status: status.status,
        message: `Workflow status: ${status.status}`,
      };

    } catch (error) {
      logger.error(error, '[ResumeWorkflowTool] Error:');

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if it's a step mismatch error
      if (errorMessage.includes('was not suspended') || errorMessage.includes('Available suspended steps')) {
        return {
          success: false,
          message: 'Workflow state mismatch detected. The workflow may have progressed differently than expected. Please try starting a new workflow.',
          error: errorMessage,
          suggestion: 'restart_workflow',
        };
      }

      // Check if workflow session expired
      if (errorMessage.includes('Workflow run not found') || errorMessage.includes('session expired')) {
        return {
          success: false,
          message: 'Workflow session has expired (server may have restarted). Please start a new workflow.',
          error: errorMessage,
          suggestion: 'restart_workflow',
        };
      }

      return {
        success: false,
        message: 'Failed to resume workflow',
        error: errorMessage,
      };
    }
  },
});
