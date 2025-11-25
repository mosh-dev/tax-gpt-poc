import type { StreamEvent, WorkflowStatus } from '../../types/common.types';
import { TOOL_NAMES, WORKFLOW_IDS, WORKFLOW_STATUS } from '../../constants/workflow';
import type { Dispatch, SetStateAction } from 'react';

/**
 * Extract workflow status from tool result
 * Returns WorkflowStatus if workflow is suspended, null otherwise
 */
export function extractWorkflowStatusFromResult(
  toolName: string,
  result: any,
  threadId: string
): WorkflowStatus | null {
  // Only process workflow tools
  if (toolName !== TOOL_NAMES.START_WORKFLOW && toolName !== TOOL_NAMES.RESUME_WORKFLOW) {
    return null;
  }

  console.log('[Workflow] Tool result received:', toolName, result);

  // Handle successful workflow progression (suspended, awaiting input)
  if (result?.success && !result?.completed && result?.runId) {
    const workflowStatus: WorkflowStatus = {
      runId: result.runId,
      threadId: threadId,
      workflowId: WORKFLOW_IDS.TAX_CALCULATION,
      status: WORKFLOW_STATUS.SUSPENDED,
      currentStep: result.nextStep || result.currentStep,
      suspendPayload: result.suspendPayload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    console.log('[Workflow] Updated:', workflowStatus.currentStep);
    return workflowStatus;
  }

  // Handle workflow completion - clear workflow state
  if (result?.success && result?.completed) {
    console.log('[Workflow] Completed');
    return null; // Signal to clear workflow
  }

  // Handle workflow errors - clear workflow state
  if (result?.success === false) {
    console.log('[Workflow] Error:', result.error || result.message);
    return null; // Signal to clear workflow
  }

  return null;
}

/**
 * Handle workflow tool result event
 * Updates workflow state based on tool result
 * Returns true if workflow state was updated
 */
export function handleWorkflowToolResult(
  event: StreamEvent,
  threadId: string,
  setActiveWorkflow: Dispatch<SetStateAction<WorkflowStatus | null>>,
  setIsWorkflowSubmitting: Dispatch<SetStateAction<boolean>>
): boolean {
  if (!event.toolName || !event.result) return false;

  // Check if this is a workflow tool
  if (event.toolName !== TOOL_NAMES.START_WORKFLOW && event.toolName !== TOOL_NAMES.RESUME_WORKFLOW) {
    return false;
  }

  const workflowStatus = extractWorkflowStatusFromResult(event.toolName, event.result, threadId);

  // Update workflow state
  setActiveWorkflow(workflowStatus);
  setIsWorkflowSubmitting(false); // Clear submitting state

  return true; // Workflow state was updated
}
