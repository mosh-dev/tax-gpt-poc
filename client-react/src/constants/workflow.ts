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

// Tool Names (as they appear in SSE events)
export const TOOL_NAMES = {
  GET_TAX_DATA: 'getTaxDataTool',
  CALCULATE_DEDUCTIONS: 'calculateDeductionsTool',
  GENERATE_TAX_PDF: 'generateTaxPDFTool',
  SEARCH_KNOWLEDGE_BASE: 'searchKnowledgeTool',
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

// Step Titles for UI display
export const STEP_TITLES: Record<string, string> = {
  [WORKFLOW_STEPS.COLLECT_PERSONAL_INFO]: 'Personal Information',
  [WORKFLOW_STEPS.UPLOAD_DOCUMENTS]: 'Document Upload',
  [WORKFLOW_STEPS.REVIEW_EXTRACTED_DATA]: 'Review Tax Data',
  [WORKFLOW_STEPS.CALCULATE_TAX]: 'Tax Calculation',
  [WORKFLOW_STEPS.GENERATE_SUMMARY]: 'Summary & PDF',
};

// Type exports
export type WorkflowId = typeof WORKFLOW_IDS[keyof typeof WORKFLOW_IDS];
export type WorkflowStep = typeof WORKFLOW_STEPS[keyof typeof WORKFLOW_STEPS];
export type ToolName = typeof TOOL_NAMES[keyof typeof TOOL_NAMES];
export type WorkflowStatusType = typeof WORKFLOW_STATUS[keyof typeof WORKFLOW_STATUS];
