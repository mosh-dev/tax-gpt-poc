/**
 * Tool Result Router
 * Routes tool results to appropriate handlers
 */

import type { StreamEvent, Message } from '../../types/common.types';
import type { TaxDataToolResult } from '../../components/Chat/Chat.types';
import { TOOL_NAMES } from '../../constants/workflow';
import {
  handleGetTaxDataResult,
  handleGenerateTaxPdfResult,
  handleCalculateDeductionsResult,
} from './toolResultHandlers';

interface ToolResultHandlerContext {
  setPendingToolResult: (result: TaxDataToolResult | null) => void;
  setIsModalOpen: (isOpen: boolean) => void;
}

/**
 * Route tool result to appropriate handler based on tool name
 */
export const routeToolResult = (
  event: StreamEvent,
  assistantMessage: Message,
  context: ToolResultHandlerContext
) => {
  switch (event.toolName) {
    case TOOL_NAMES.GET_TAX_DATA:
      handleGetTaxDataResult(event.result, context);
      break;

    case TOOL_NAMES.GENERATE_TAX_PDF:
      handleGenerateTaxPdfResult(event.result, assistantMessage);
      break;

    case TOOL_NAMES.CALCULATE_DEDUCTIONS:
      handleCalculateDeductionsResult(event.result, assistantMessage);
      break;

    default:
      console.log('Tool result:', event.toolName, event.result);
      break;
  }
};
