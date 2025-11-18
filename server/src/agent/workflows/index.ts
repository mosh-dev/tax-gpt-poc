/**
 * Workflows
 * Exports all Mastra workflows
 */

export {
  taxCalculationWorkflow,
  type PersonalInfo,
  type DocumentData,
  type ExtractedData,
  type CalculationResult,
  type WorkflowSummary,
} from './tax-calculation-workflow';

export {
  WorkflowService,
  workflowService,
  type WorkflowStatus,
} from './workflow-service';