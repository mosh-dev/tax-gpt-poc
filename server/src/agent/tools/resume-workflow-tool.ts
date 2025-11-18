/**
 * Resume Workflow Tool
 * Mastra tool for resuming suspended workflows
 * Called by AI agent to continue workflow steps
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { workflowService } from '../workflows';

export const resumeWorkflowTool = createTool({
  id: 'resume-workflow',
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
    try {
      console.log(`[ResumeWorkflowTool] Resuming workflow ${runId} at step ${stepId}`);
      console.log(`[ResumeWorkflowTool] Data:`, JSON.stringify(data, null, 2));

      const status = await workflowService.resumeWorkflow(runId, stepId, data);

      console.log(`[ResumeWorkflowTool] Workflow status: ${status.status}`);

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
      console.error('[ResumeWorkflowTool] Error:', error);
      return {
        success: false,
        message: 'Failed to resume workflow',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
