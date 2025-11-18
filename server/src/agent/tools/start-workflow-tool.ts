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
