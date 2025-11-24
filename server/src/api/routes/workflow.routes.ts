/**
 * Workflow Routes
 * API endpoints for managing workflows with human-in-the-loop
 */

import { Router, Request, Response } from 'express';
import { getErrorMessage } from '@utils/error-handler';
import { workflowService } from '@/mastra/workflows/tax-calculation/tax-calculation-workflow.service';

const router = Router();

/**
 * POST /api/workflows/tax-calculation/start
 * Start a new tax calculation workflow
 */
router.post('/tax-calculation/start', async (req: Request, res: Response) => {
  try {
    const { threadId, message } = req.body;

    if (!threadId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'threadId is required',
      });
    }

    console.log(`[WorkflowRoutes] Starting tax calculation for thread: ${threadId}`);

    const status = await workflowService.startTaxCalculation(threadId, message);

    res.json({
      success: true,
      workflow: status,
    });
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error);
    console.error('[WorkflowRoutes] Error starting workflow:', errorMsg);
    res.status(500).json({
      error: 'Internal Server Error',
      message: errorMsg,
    });
  }
});

/**
 * POST /api/workflows/:runId/resume
 * Resume a suspended workflow with user data
 */
router.post('/:runId/resume', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const { stepId, data } = req.body;

    if (!stepId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'stepId is required',
      });
    }

    if (!data) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'data is required',
      });
    }

    console.log(`[WorkflowRoutes] Resuming workflow ${runId} at step ${stepId}`);

    const status = await workflowService.resumeWorkflow(runId, stepId, data);

    res.json({
      success: true,
      workflow: status,
    });
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error);
    console.error('[WorkflowRoutes] Error resuming workflow:', errorMsg);

    if (errorMsg.includes('not found')) {
      return res.status(404).json({
        error: 'Not Found',
        message: errorMsg,
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: errorMsg,
    });
  }
});

/**
 * GET /api/workflows/:runId/status
 * Get the status of a workflow run
 */
router.get('/:runId/status', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;

    const status = workflowService.getWorkflowStatus(runId);

    if (!status) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Workflow run not found: ${runId}`,
      });
    }

    res.json({
      success: true,
      workflow: status,
    });
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error);
    console.error('[WorkflowRoutes] Error getting workflow status:', errorMsg);
    res.status(500).json({
      error: 'Internal Server Error',
      message: errorMsg,
    });
  }
});

/**
 * DELETE /api/workflows/:runId
 * Cancel a workflow run
 */
router.delete('/:runId', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;

    const cancelled = workflowService.cancelWorkflow(runId);

    if (!cancelled) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Workflow run not found: ${runId}`,
      });
    }

    res.json({
      success: true,
      message: 'Workflow cancelled',
    });
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error);
    console.error('[WorkflowRoutes] Error cancelling workflow:', errorMsg);
    res.status(500).json({
      error: 'Internal Server Error',
      message: errorMsg,
    });
  }
});

/**
 * GET /api/workflows/thread/:threadId
 * Get all active workflows for a thread
 */
router.get('/thread/:threadId', async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;

    const workflows = workflowService.getActiveWorkflows(threadId);

    res.json({
      success: true,
      workflows,
    });
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error);
    console.error('[WorkflowRoutes] Error getting thread workflows:', errorMsg);
    res.status(500).json({
      error: 'Internal Server Error',
      message: errorMsg,
    });
  }
});

export { router as workflowRoutes };
