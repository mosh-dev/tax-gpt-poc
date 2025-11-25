/**
 * Workflow State Utilities
 * Handles workflow state extraction and management from messages
 */

import type { Message, WorkflowStatus } from '../../types/common.types';
import { TOOL_NAMES, WORKFLOW_IDS, WORKFLOW_STATUS } from '../../constants/workflow';

/**
 * Updates workflow state based on the last message's tool calls
 * Extracts workflow information from START_WORKFLOW or RESUME_WORKFLOW tool results
 */
export const extractWorkflowState = (
  lastMessage: Message,
  threadId: string
): WorkflowStatus | null => {
  if (!lastMessage?.toolCalls || lastMessage.toolCalls.length === 0) {
    return null;
  }

  // Find the last workflow tool call by iterating in reverse
  const lastWorkflowToolCall = [...lastMessage.toolCalls]
    .reverse()
    .find(toolCall =>
      (toolCall.toolName === TOOL_NAMES.START_WORKFLOW ||
       toolCall.toolName === TOOL_NAMES.RESUME_WORKFLOW) &&
      toolCall.result
    );

  if (!lastWorkflowToolCall) {
    return null;
  }

  const result = lastWorkflowToolCall.result;

  // Check if workflow is suspended (not completed)
  if (result.success && !result.completed && result.runId) {
    return {
      runId: result.runId,
      threadId: threadId,
      workflowId: WORKFLOW_IDS.TAX_CALCULATION,
      status: WORKFLOW_STATUS.SUSPENDED,
      currentStep: result.nextStep || result.currentStep,
      suspendPayload: result.suspendPayload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return null;
};
