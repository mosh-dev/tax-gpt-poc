/**
 * Workflow Service
 * Manages workflow runs and their state
 */
import { getCollection } from '@config/database-utils';
import { MASTRA_COLLECTIONS } from '@config/database-collections';
import { getErrorMessage } from '@utils/error-handler';
import { WORKFLOW_IDS } from '@/constants/workflow';
import { getMastra } from '@/mastra/mastra-instance';

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

export class TaxCalculationWorkflowService {
  /**
   * Start a new tax calculation workflow
   */
  async startTaxCalculation(threadId: string, message?: string): Promise<WorkflowStatus> {
    console.log(`[WorkflowService] Starting tax calculation workflow for thread: ${threadId}`);

    try {
      // Get workflow from Mastra instance (via getter to avoid circular dependency)
      const mastra = getMastra();
      const workflow = mastra.getWorkflow('taxCalculation');

      // Create workflow run
      const run = await workflow.createRun();

      // Store the run with its internal ID for later resume
      const runId = run.runId;
      workflowRuns.set(runId, {
        run,
        threadId,
        workflowId: WORKFLOW_IDS.TAX_CALCULATION,
        createdAt: new Date(),
      });
      console.log(`[WorkflowService] Stored workflow run in memory. Active runs: ${workflowRuns.size}`);
      console.log(`[WorkflowService] RunId: ${runId}`);

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
        workflowId: WORKFLOW_IDS.TAX_CALCULATION,
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
        console.log(`[WorkflowService] Workflow completed on start`);

        // Delete workflow snapshot from MongoDB to prevent conflicts with future workflows
        await this.deleteWorkflowSnapshot(runId);
      }

      // Handle error state
      if (result.status === 'failed') {
        status.error = result.error?.message || 'Unknown error';
        console.log(`[WorkflowService] Workflow failed on start:`, status.error);

        // Delete workflow snapshot from MongoDB to prevent conflicts with future workflows
        await this.deleteWorkflowSnapshot(runId);
      }

      console.log(`[WorkflowService] Returning initial status:`, {
        runId: status.runId,
        status: status.status,
        currentStep: status.currentStep
      });

      return status;
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error('[WorkflowService] Error starting workflow:', errorMsg);
      throw new Error(`Failed to start workflow: ${errorMsg}`);
    }
  }

  /**
   * Resume a suspended workflow with user data
   */
  async resumeWorkflow(runId: string, stepId: string, resumeData: any): Promise<WorkflowStatus> {
    console.log(`[WorkflowService] Resuming workflow ${runId} at step ${stepId}`);
    console.log(`[WorkflowService] Currently active runs: ${workflowRuns.size}`);
    console.log(`[WorkflowService] Active runIds:`, Array.from(workflowRuns.keys()));

    const runData = workflowRuns.get(runId);
    if (!runData) {
      console.error(`[WorkflowService] RunId ${runId} not found in memory!`);
      console.error(`[WorkflowService] Available runIds:`, Array.from(workflowRuns.keys()));
      throw new Error(`Workflow run not found: ${runId}. The server may have restarted or the workflow session expired.`);
    }

    try {
      const { run, threadId, workflowId } = runData;

      // Log resume data for debugging
      console.log(`[WorkflowService] Resume data:`, JSON.stringify(resumeData, null, 2));
      console.log(`[WorkflowService] Resuming at step: ${stepId}`);

      // Resume the workflow with the provided step
      // The client validates stepId matches workflow.currentStep before calling
      const result = await run.resume({
        step: stepId,
        resumeData,
      });

      console.log(`[WorkflowService] Workflow resumed, status: ${result.status}`);
      console.log(`[WorkflowService] Full result object:`, JSON.stringify({
        status: result.status,
        suspended: result.suspended,
        error: result.error,
        steps: Object.keys(result.steps || {})
      }, null, 2));

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

        console.log(`[WorkflowService] After resume - suspended at step: ${suspendedStepId}`);
        console.log(`[WorkflowService] Suspended steps array:`, result.suspended);

        // Get suspend payload from the step
        const stepResult = result.steps?.[suspendedStepId];
        if (stepResult?.suspendPayload) {
          status.suspendPayload = stepResult.suspendPayload;
          console.log(`[WorkflowService] Suspend payload for step ${suspendedStepId}:`, status.suspendPayload.reason);
        }
      }

      // Handle completed state
      if (result.status === 'success') {
        status.status = 'completed';
        status.result = result.result;

        // Clean up completed run
        workflowRuns.delete(runId);
        console.log(`[WorkflowService] Deleted completed workflow from memory. Active runs: ${workflowRuns.size}`);

        // Delete workflow snapshot from MongoDB to prevent conflicts with future workflows
        await this.deleteWorkflowSnapshot(runId);
      }

      // Handle error state
      if (result.status === 'failed') {
        status.error = result.error?.message || 'Unknown error';
        workflowRuns.delete(runId);
        console.log(`[WorkflowService] Deleted failed workflow from memory. Active runs: ${workflowRuns.size}`);

        // Delete workflow snapshot from MongoDB to prevent conflicts with future workflows
        await this.deleteWorkflowSnapshot(runId);
      }

      console.log(`[WorkflowService] Returning resume status:`, {
        runId: status.runId,
        status: status.status,
        currentStep: status.currentStep
      });

      return status;
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error('[WorkflowService] Error resuming workflow:', errorMsg);
      throw new Error(`Failed to resume workflow: ${errorMsg}`);
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

  /**
   * Delete workflow snapshot from MongoDB
   * Called when workflow completes or fails to prevent conflicts with future workflows
   */
  private async deleteWorkflowSnapshot(runId: string): Promise<void> {
    try {
      const snapshotCollection = getCollection(MASTRA_COLLECTIONS.WORKFLOW_SNAPSHOT);

      if (snapshotCollection) {
        const result = await snapshotCollection.deleteMany({ run_id: runId });
        console.log(`[WorkflowService] Deleted ${result.deletedCount} workflow snapshot(s) for runId: ${runId}`);
      } else {
        console.warn('[WorkflowService] MongoDB connection not available for workflow snapshot cleanup');
      }
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error('[WorkflowService] Error deleting workflow snapshot:', errorMsg);
      // Don't throw - snapshot cleanup failure shouldn't break the main flow
    }
  }
}

// Export singleton instance
export const workflowService = new TaxCalculationWorkflowService();
