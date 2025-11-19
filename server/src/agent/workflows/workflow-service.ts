/**
 * Workflow Service
 * Manages workflow runs and their state
 */

import { Mastra } from '@mastra/core';
import { MongoDBStore } from '@mastra/mongodb';
import { taxCalculationWorkflow } from './tax-calculation-workflow';
import { env } from '../../config/env';

// Create MongoDB storage for workflow snapshots
const workflowStorage = new MongoDBStore({
  id: 'tax-gpt-workflow-storage',
  url: env.MONGODB_URI,
  dbName: env.MONGODB_DB_NAME,
});

// Create Mastra instance with storage and workflows
const mastra = new Mastra({
  storage: workflowStorage,
  workflows: {
    taxCalculation: taxCalculationWorkflow,
  },
});

// Store active workflow run IDs mapped to their internal Mastra run IDs
const workflowRuns = new Map<string, any>();

export interface WorkflowStatus {
  runId: string;
  threadId: string;
  workflowId: string;
  status: 'running' | 'suspended' | 'completed' | 'failed';
  currentStep?: string;
  suspendPayload?: any;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class WorkflowService {
  /**
   * Start a new tax calculation workflow
   */
  async startTaxCalculation(threadId: string, message?: string): Promise<WorkflowStatus> {
    console.log(`[WorkflowService] Starting tax calculation workflow for thread: ${threadId}`);

    try {
      // Get workflow from Mastra instance (ensures storage is configured)
      const workflow = mastra.getWorkflow('taxCalculation');

      // Create workflow run
      const run = await workflow.createRun();

      // Store the run with its internal ID for later resume
      const runId = run.runId;
      workflowRuns.set(runId, {
        run,
        threadId,
        workflowId: 'tax-calculation-workflow',
        createdAt: new Date(),
      });

      // Start the workflow
      const result = await run.start({
        inputData: {
          threadId,
          message,
        },
      });

      console.log(`[WorkflowService] Workflow started, status: ${result.status}`);

      // Build status response
      const status: WorkflowStatus = {
        runId,
        threadId,
        workflowId: 'tax-calculation-workflow',
        status: result.status as WorkflowStatus['status'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Handle suspended state
      if (result.status === 'suspended' && result.suspended) {
        const suspendedStepId = result.suspended[0][0];
        status.currentStep = suspendedStepId;

        // Get suspend payload from the step
        const stepResult = result.steps?.[suspendedStepId];
        if (stepResult?.suspendPayload) {
          status.suspendPayload = stepResult.suspendPayload;
        }
      }

      // Handle completed state
      if (result.status === 'success') {
        status.status = 'completed';
        status.result = result.result;
      }

      // Handle error state
      if (result.status === 'failed') {
        status.error = result.error?.message || 'Unknown error';
      }

      return status;
    } catch (error: any) {
      console.error('[WorkflowService] Error starting workflow:', error);
      throw new Error(`Failed to start workflow: ${error.message}`);
    }
  }

  /**
   * Resume a suspended workflow with user data
   */
  async resumeWorkflow(runId: string, stepId: string, resumeData: any): Promise<WorkflowStatus> {
    console.log(`[WorkflowService] Resuming workflow ${runId} at step ${stepId}`);

    const runData = workflowRuns.get(runId);
    if (!runData) {
      throw new Error(`Workflow run not found: ${runId}. The server may have restarted or the workflow session expired.`);
    }

    try {
      const { run, threadId, workflowId } = runData;

      // Log resume data for debugging
      console.log(`[WorkflowService] Resume data:`, JSON.stringify(resumeData, null, 2));

      // Resume the workflow
      const result = await run.resume({
        step: stepId,
        resumeData,
      });

      console.log(`[WorkflowService] Workflow resumed, status: ${result.status}`);

      // Build status response
      const status: WorkflowStatus = {
        runId,
        threadId,
        workflowId,
        status: result.status as WorkflowStatus['status'],
        createdAt: runData.createdAt || new Date(),
        updatedAt: new Date(),
      };

      // Handle suspended state
      if (result.status === 'suspended' && result.suspended) {
        const suspendedStepId = result.suspended[0][0];
        status.currentStep = suspendedStepId;

        // Get suspend payload from the step
        const stepResult = result.steps?.[suspendedStepId];
        if (stepResult?.suspendPayload) {
          status.suspendPayload = stepResult.suspendPayload;
        }
      }

      // Handle completed state
      if (result.status === 'success') {
        status.status = 'completed';
        status.result = result.result;

        // Clean up completed run
        workflowRuns.delete(runId);
      }

      // Handle error state
      if (result.status === 'failed') {
        status.error = result.error?.message || 'Unknown error';
        workflowRuns.delete(runId);
      }

      return status;
    } catch (error: any) {
      console.error('[WorkflowService] Error resuming workflow:', error);
      throw new Error(`Failed to resume workflow: ${error.message}`);
    }
  }

  /**
   * Get the status of a workflow run
   */
  getWorkflowStatus(runId: string): WorkflowStatus | null {
    const runData = workflowRuns.get(runId);
    if (!runData) {
      return null;
    }

    return {
      runId,
      threadId: runData.threadId,
      workflowId: runData.workflowId,
      status: 'suspended', // If it's in the map, it's still active
      currentStep: runData.currentStep,
      suspendPayload: runData.suspendPayload,
      createdAt: runData.createdAt || new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Cancel a workflow run
   */
  cancelWorkflow(runId: string): boolean {
    if (workflowRuns.has(runId)) {
      workflowRuns.delete(runId);
      console.log(`[WorkflowService] Workflow ${runId} cancelled`);
      return true;
    }
    return false;
  }

  /**
   * Get all active workflow runs for a thread
   */
  getActiveWorkflows(threadId: string): WorkflowStatus[] {
    const active: WorkflowStatus[] = [];

    workflowRuns.forEach((runData, runId) => {
      if (runData.threadId === threadId) {
        active.push({
          runId,
          threadId: runData.threadId,
          workflowId: runData.workflowId,
          status: 'suspended',
          currentStep: runData.currentStep,
          createdAt: runData.createdAt || new Date(),
          updatedAt: new Date(),
        });
      }
    });

    return active;
  }
}

// Export singleton instance
export const workflowService = new WorkflowService();