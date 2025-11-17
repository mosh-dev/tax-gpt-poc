/**
 * PDF Generator Service Interface
 * Contract for generating PDF documents
 */

export interface PDFGenerationOptions {
  title?: string;
  author?: string;
  subject?: string;
  metadata?: Record<string, any>;
}

export interface PDFGenerationResult {
  filePath: string;
  fileName: string;
  size: number;
  url: string;
}

export interface IPDFGeneratorService {
  /**
   * Generate tax return PDF
   */
  generateTaxPDF(
    taxData: any,
    taxYear: number,
    options?: PDFGenerationOptions
  ): Promise<PDFGenerationResult>;

  /**
   * Generate generic PDF from content
   */
  generatePDF(
    content: string,
    title: string,
    options?: PDFGenerationOptions
  ): Promise<PDFGenerationResult>;
}
