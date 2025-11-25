/**
 * Tool ID Constants
 * Centralized tool IDs to prevent mismatches between tool definitions and references
 */

export const TOOL_IDS = {
  // Tax calculation workflow tools
  START_TAX_CALCULATION: 'start-tax-calculation',
  RESUME_TAX_CALCULATION: 'resume-tax-calculation',

  // Tax data tools
  GET_TAX_DATA: 'get-tax-data',
  CALCULATE_DEDUCTIONS: 'calculate-deductions',
  GENERATE_TAX_PDF: 'generate-tax-pdf',

  // Document processing
  PROCESS_DOCUMENTS: 'process-documents',

  // Knowledge base
  SEARCH_KNOWLEDGE: 'search-knowledge',
} as const;

// Type-safe tool ID type
export type ToolId = typeof TOOL_IDS[keyof typeof TOOL_IDS];