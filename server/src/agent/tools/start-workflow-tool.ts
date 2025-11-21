/**
 * Start Workflow Tool
 * Mastra tool for starting tax calculation workflows
 * Called by AI agent when user wants to do a complete tax calculation
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { workflowService } from '../workflows';

export const startWorkflowTool = createTool({
  id: 'start-workflow',
  description: `Start a new tax calculation workflow.

USE THIS WHEN:
- User explicitly requests the workflow using "start workflow", "begin workflow", "start it", "initiate workflow"
- User confirms after you offer the workflow choice
- User wants to calculate their taxes step-by-step
- User wants to do a complete tax return
- User mentions they need help filing taxes

WORKFLOW PROCESS:
This starts a multi-step workflow that collects:
1. Personal information (name, marital status, children, canton, tax year)
2. Tax documents (upload and OCR processing)
3. Income, deductions, and wealth data
4. Final summary with PDF generation

INPUT:
- threadId: The conversation thread ID (required)
- message: Optional initial message from the user

OUTPUT:
- success: Boolean indicating if workflow started successfully
- message: Human-readable status message
- runId: Unique workflow run identifier for resuming later
- currentStep: The current step ID (e.g., "collect-personal-info")
- suspendPayload: Data describing what information is needed from user
- status: Workflow status (suspended, completed, failed)`,
  inputSchema: z.object({
    threadId: z.string().describe('The conversation thread ID'),
    message: z.string().optional().describe('Optional initial message from the user'),
  }),
  execute: async ({ threadId, message }) => {
    try {
      console.log(`[StartWorkflowTool] Starting tax calculation workflow for thread: ${threadId}`);

      const status = await workflowService.startTaxCalculation(threadId, message);

      console.log(`[StartWorkflowTool] Workflow started with status: ${status.status}`);

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
