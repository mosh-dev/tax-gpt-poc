/**
 * Workflow Service
 * Manages workflow runs and their state
 * All workflow state is persisted to MongoDB via Mastra's workflowStorage
 */
import { getCollection } from '@config/database-utils';
import { MASTRA_COLLECTIONS } from '@config/database-collections';
import { getErrorMessage } from '@utils/error-handler';
import { WORKFLOW_IDS } from '@/constants/workflow';
import { getMastra } from '@/mastra/mastra-instance';

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
   * Workflow state is automatically persisted to MongoDB by Mastra
   */
  async startTaxCalculation(threadId: string, message?: string): Promise<WorkflowStatus> {
    console.log(`[WorkflowService] Starting tax calculation workflow for thread: ${threadId}`);

    try {
      const mastra = getMastra();
      const workflow = mastra.getWorkflow('taxCalculation');

      // Create workflow run (automatically persisted to MongoDB)
      const run = await workflow.createRun();
      const runId = run.runId;
      console.log(`[WorkflowService] Created workflow run: ${runId}`);

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
        await this.deleteWorkflowSnapshot(runId);
      }

      // Handle error state
      if (result.status === 'failed') {
        status.error = result.error?.message || 'Unknown error';
        console.log(`[WorkflowService] Workflow failed on start:`, status.error);
        await this.deleteWorkflowSnapshot(runId);
      }

      return status;
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error('[WorkflowService] Error starting workflow:', errorMsg);
      throw new Error(`Failed to start workflow: ${errorMsg}`);
    }
  }

  /**
   * Resume a suspended workflow with user data
   * Loads workflow from MongoDB storage (survives server restarts)
   */
  async resumeWorkflow(runId: string, stepId: string, resumeData: any): Promise<WorkflowStatus> {
    console.log(`[WorkflowService] Resuming workflow ${runId} at step ${stepId}`);

    try {
      const mastra = getMastra();
      const workflow = mastra.getWorkflow('taxCalculation');

      // Load workflow run from MongoDB
      const workflowRunSnapshot = await workflow.getWorkflowRunById(runId);

      if (!workflowRunSnapshot) {
        throw new Error(`Workflow run not found in storage: ${runId}. The workflow may have been completed or cancelled.`);
      }

      console.log(`[WorkflowService] Found workflow snapshot in MongoDB, restoring run...`);

      // Create a new Run instance from the existing runId (Mastra loads from storage)
      const run = await workflow.createRun({ runId });

      // Extract metadata from snapshot
      const snapshot = typeof workflowRunSnapshot.snapshot === 'string'
        ? JSON.parse(workflowRunSnapshot.snapshot)
        : workflowRunSnapshot.snapshot;

      const threadId = snapshot?.context?.input?.threadId || '';

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
        workflowId: WORKFLOW_IDS.TAX_CALCULATION,
        status: result.status as WorkflowStatus['status'],
        createdAt: workflowRunSnapshot.createdAt,
        updatedAt: new Date(),
      };

      // Handle suspended state
      if (result.status === 'suspended' && result.suspended) {
        const suspendedStepId = result.suspended[0][0];
        status.currentStep = suspendedStepId;

        const stepResult = result.steps?.[suspendedStepId];
        if (stepResult?.suspendPayload) {
          status.suspendPayload = stepResult.suspendPayload;
        }
      }

      // Handle completed state
      if (result.status === 'success') {
        status.status = 'completed';
        status.result = result.result;
        console.log(`[WorkflowService] Workflow completed`);
        await this.deleteWorkflowSnapshot(runId);
      }

      // Handle error state
      if (result.status === 'failed') {
        status.error = result.error?.message || 'Unknown error';
        console.log(`[WorkflowService] Workflow failed:`, status.error);
        await this.deleteWorkflowSnapshot(runId);
      }

      return status;
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error('[WorkflowService] Error resuming workflow:', errorMsg);
      throw new Error(`Failed to resume workflow: ${errorMsg}`);
    }
  }

  /**
   * Get the status of a workflow run from MongoDB
   */
  async getWorkflowStatus(runId: string): Promise<WorkflowStatus | null> {
    try {
      const mastra = getMastra();
      const workflow = mastra.getWorkflow('taxCalculation');

      const workflowRunSnapshot = await workflow.getWorkflowRunById(runId);

      if (!workflowRunSnapshot) {
        return null;
      }

      const snapshot = typeof workflowRunSnapshot.snapshot === 'string'
        ? JSON.parse(workflowRunSnapshot.snapshot)
        : workflowRunSnapshot.snapshot;

      const threadId = snapshot?.context?.input?.threadId || '';

      return {
        runId,
        threadId,
        workflowId: WORKFLOW_IDS.TAX_CALCULATION,
        status: snapshot?.status || 'suspended',
        currentStep: snapshot?.suspended?.[0]?.[0],
        createdAt: workflowRunSnapshot.createdAt,
        updatedAt: workflowRunSnapshot.updatedAt,
      };
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error('[WorkflowService] Error getting workflow status:', errorMsg);
      return null;
    }
  }

  /**
   * Cancel a workflow run
   */
  async cancelWorkflow(runId: string): Promise<boolean> {
    try {
      await this.deleteWorkflowSnapshot(runId);
      console.log(`[WorkflowService] Workflow ${runId} cancelled`);
      return true;
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error('[WorkflowService] Error cancelling workflow:', errorMsg);
      return false;
    }
  }

  /**
   * Get all active workflow runs for a thread from MongoDB
   */
  async getActiveWorkflows(threadId: string): Promise<WorkflowStatus[]> {
    try {
      const mastra = getMastra();
      const workflow = mastra.getWorkflow('taxCalculation');

      const runs = await workflow.listActiveWorkflowRuns();
      const active: WorkflowStatus[] = [];

      for (const run of runs.runs) {
        const snapshot = typeof run.snapshot === 'string'
          ? JSON.parse(run.snapshot)
          : run.snapshot;

        const runThreadId = snapshot?.context?.input?.threadId || '';

        if (runThreadId === threadId) {
          active.push({
            runId: run.runId,
            threadId: runThreadId,
            workflowId: WORKFLOW_IDS.TAX_CALCULATION,
            status: 'suspended',
            currentStep: snapshot?.suspended?.[0]?.[0],
            createdAt: run.createdAt,
            updatedAt: run.updatedAt,
          });
        }
      }

      return active;
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error('[WorkflowService] Error getting active workflows:', errorMsg);
      return [];
    }
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