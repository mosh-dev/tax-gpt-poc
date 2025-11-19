/**
 * Workflow Constants
 * Centralized constants for workflow-related values
 */

// Workflow IDs
export const WORKFLOW_IDS = {
  TAX_CALCULATION: 'tax-calculation-workflow',
} as const;

// Workflow Step IDs
export const WORKFLOW_STEPS = {
  COLLECT_PERSONAL_INFO: 'collect-personal-info',
  UPLOAD_DOCUMENTS: 'upload-documents',
  REVIEW_EXTRACTED_DATA: 'review-extracted-data',
  CALCULATE_TAX: 'calculate-tax',
  GENERATE_SUMMARY: 'generate-summary',
} as const;

// Tool Names (as they appear in the agent)
export const TOOL_NAMES = {
  GET_TAX_DATA: 'getTaxDataTool',
  CALCULATE_DEDUCTIONS: 'calculateDeductionsTool',
  GENERATE_TAX_PDF: 'generateTaxPDFTool',
  PROCESS_DOCUMENTS: 'processDocumentsTool',
  START_WORKFLOW: 'startWorkflowTool',
  RESUME_WORKFLOW: 'resumeWorkflowTool',
} as const;

// Workflow Statuses
export const WORKFLOW_STATUS = {
  RUNNING: 'running',
  SUSPENDED: 'suspended',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

// Type exports
export type WorkflowId = typeof WORKFLOW_IDS[keyof typeof WORKFLOW_IDS];
export type WorkflowStep = typeof WORKFLOW_STEPS[keyof typeof WORKFLOW_STEPS];
export type ToolName = typeof TOOL_NAMES[keyof typeof TOOL_NAMES];
export type WorkflowStatusType = typeof WORKFLOW_STATUS[keyof typeof WORKFLOW_STATUS];
