/**
 * Workflow Service
 * Manages workflow runs and their state
 * All workflow state is persisted to MongoDB via Mastra's workflowStorage
 */
import { getCollection } from '@infrastructure/database/utils';
import { MASTRA_COLLECTIONS } from '@config/database-collections';
import { WORKFLOW_IDS } from '@shared/constants/workflow';
import { getMastra } from '@/mastra/mastra-instance';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { AgentLoggerService } from '@infrastructure/ai/agent-logger.service';

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
  private readonly logger = injectFromContainer(AgentLoggerService);

  /**
   * Start a new tax calculation workflow
   * Workflow state is automatically persisted to MongoDB by Mastra
   */
  async startTaxCalculation(threadId: string, message?: string): Promise<WorkflowStatus> {

    try {
      const mastra = getMastra();
      const workflow = mastra.getWorkflow('taxCalculation');

      // Create workflow run (automatically persisted to MongoDB)
      const run = await workflow.createRun();
      const runId = run.runId;
      this.logger.info(`[WorkflowService] Created workflow run: ${runId}`);

      // Start the workflow
      const result = await run.start({
        inputData: {
          threadId,
          message,
        },
      });

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
        this.logger.info(`[WorkflowService] Workflow completed on start`);
        await this.deleteWorkflowSnapshot(runId);
      }

      // Handle error state
      if (result.status === 'failed') {
        status.error = result.error?.message || 'Unknown error';
        this.logger.info(result, `[WorkflowService] Workflow failed on start:`);
        await this.deleteWorkflowSnapshot(runId);
      }

      return status;
    } catch (error) {
      this.logger.error({ error }, '[WorkflowService] Error starting workflow');
      throw error;
    }
  }

  /**
   * Resume a suspended workflow with user data
   * Loads workflow from MongoDB storage (survives server restarts)
   */
  async resumeWorkflow(runId: string, stepId: string, resumeData: any): Promise<WorkflowStatus> {

    const mastra = getMastra();
    const workflow = mastra.getWorkflow('taxCalculation');

    // Load workflow run from MongoDB
    const workflowRunSnapshot = await workflow.getWorkflowRunById(runId);

    if (!workflowRunSnapshot) {
      throw new Error(`Workflow run not found in storage: ${runId}. The workflow may have been completed or cancelled.`);
    }

    this.logger.info(`[WorkflowService] Found workflow snapshot in MongoDB, restoring run...`);

    // Create a new Run instance from the existing runId (Mastra loads from storage)
    const run = await workflow.createRun({ runId });

    // Extract metadata from snapshot
    const snapshot = typeof workflowRunSnapshot.snapshot === 'string'
      ? JSON.parse(workflowRunSnapshot.snapshot)
      : workflowRunSnapshot.snapshot;

    const threadId = snapshot?.context?.input?.threadId || '';

    // Resume the workflow
    const result = await run.resume({
      step: stepId,
      resumeData,
    });

    this.logger.info(`[WorkflowService] Workflow resumed, status: ${result.status}`);

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
      this.logger.info(`[WorkflowService] Workflow completed`);
      await this.deleteWorkflowSnapshot(runId);
    }

    // Handle error state
    if (result.status === 'failed') {
      status.error = result.error?.message || 'Unknown error';
      this.logger.info(status, `[WorkflowService] Workflow failed:`);
      await this.deleteWorkflowSnapshot(runId);
    }

    return status;
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
        this.logger.info(`[WorkflowService] Deleted ${result.deletedCount} workflow snapshot(s) for runId: ${runId}`);
      } else {
        this.logger.warn('[WorkflowService] MongoDB connection not available for workflow snapshot cleanup');
      }
    } catch (error) {
      this.logger.error({ error }, '[WorkflowService] Error deleting workflow snapshot');
    }
  }
}
