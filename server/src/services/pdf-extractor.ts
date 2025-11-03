import * as pdfParse from 'pdf-parse';
import { PDFExtraction, SwissTaxData } from '../types';

/**
 * Extract text from PDF buffer
 */
export async function extractPDFText(buffer: Buffer, fileName: string): Promise<PDFExtraction> {
  try {
    const data = await (pdfParse as any)(buffer);

    return {
      success: true,
      text: data.text,
      numPages: data.numpages,
      fileName,
    };
  } catch (error: any) {
    console.error('PDF extraction error:', error);
    return {
      success: false,
      error: error.message || 'Failed to extract PDF text',
      fileName,
    };
  }
}

/**
 * Parse Swiss tax document (Lohnausweis, etc.) from extracted text
 * This is a simplified version - in production, you'd use more sophisticated parsing
 */
export function parseSwissTaxDocument(text: string): Partial<SwissTaxData> {
  const result: Partial<SwissTaxData> = {
    income: {},
    deductions: {},
  };

  // Try to extract salary/income (Bruttolohn)
  const salaryMatch = text.match(/Bruttolohn.*?(\d{1,3}(?:[''\s]\d{3})*(?:[.,]\d{2})?)/i);
  if (salaryMatch) {
    const salary = parseSwissNumber(salaryMatch[1]);
    if (result.income) {
      result.income.employment = salary;
    }
  }

  // Try to extract pension contributions (Pillar 2)
  const pensionMatch = text.match(/(?:BVG|Pensionskasse|2\.\s*Säule).*?(\d{1,3}(?:[''\s]\d{3})*(?:[.,]\d{2})?)/i);
  if (pensionMatch) {
    const pension = parseSwissNumber(pensionMatch[1]);
    if (result.deductions) {
      result.deductions.pillar3a = pension;
    }
  }

  // Try to extract health insurance (Krankenversicherung)
  const healthMatch = text.match(/Krankenversicherung.*?(\d{1,3}(?:[''\s]\d{3})*(?:[.,]\d{2})?)/i);
  if (healthMatch) {
    const health = parseSwissNumber(healthMatch[1]);
    if (result.deductions) {
      result.deductions.healthcareExpenses = health;
    }
  }

  return result;
}

/**
 * Parse Swiss number format (e.g., "85'000.50" or "85 000,50")
 */
function parseSwissNumber(str: string): number {
  // Remove Swiss thousand separators (' or space)
  const cleaned = str.replace(/['\s]/g, '');
  // Replace comma with dot for decimal
  const normalized = cleaned.replace(',', '.');
  return parseFloat(normalized) || 0;
}

/**
 * Extract tax-relevant data from PDF and return both raw text and parsed data
 */
export async function extractTaxDataFromPDF(
  buffer: Buffer,
  fileName: string
): Promise<PDFExtraction> {
  const extraction = await extractPDFText(buffer, fileName);

  if (extraction.success && extraction.text) {
    extraction.extractedData = parseSwissTaxDocument(extraction.text);
  }

  return extraction;
}
