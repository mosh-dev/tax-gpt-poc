/**
 * Tool Result Handlers
 * Handles different tool results from the streaming chat
 */

import type { Message } from '../../types/common.types';
import type { TaxDataToolResult } from '../../components/Chat/Chat.types';

interface ToolResultHandlerContext {
  setPendingToolResult: (result: TaxDataToolResult | null) => void;
  setIsModalOpen: (isOpen: boolean) => void;
}

/**
 * Handle get-tax-data tool result
 * Opens modal with tax data
 */
export const handleGetTaxDataResult = (
  result: TaxDataToolResult,
  context: ToolResultHandlerContext
) => {
  context.setPendingToolResult(result);
  context.setIsModalOpen(true);
};

/**
 * Handle generate-tax-pdf tool result
 * Appends error message to assistant message if PDF generation failed
 */
export const handleGenerateTaxPdfResult = (
  result: any,
  assistantMessage: Message
) => {
  if (!result?.downloadUrl) {
    assistantMessage.content += `\n\nFailed to generate PDF: ${result?.error || 'Unknown error'}`;
  }
};

/**
 * Handle calculate-deductions tool result
 * Formats and appends deduction results to assistant message
 */
export const handleCalculateDeductionsResult = (
  result: any,
  assistantMessage: Message
) => {
  if (!result) return;

  let summary = `\n\n📊 **Deduction Calculation Results:**\n`;
  summary += `- Total Deductions: CHF ${result.totalDeductions?.toLocaleString() || 0}\n`;
  summary += `- Estimated Tax Savings: CHF ${result.estimatedTaxSavings?.toLocaleString() || 0}\n\n`;

  if (result.recommendations && result.recommendations.length > 0) {
    summary += `💡 **Recommendations:**\n`;
    result.recommendations.forEach((rec: string, idx: number) => {
      summary += `${idx + 1}. ${rec}\n`;
    });
  }

  assistantMessage.content += summary;
};
