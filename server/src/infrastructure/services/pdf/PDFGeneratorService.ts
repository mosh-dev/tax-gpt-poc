/**
 * PDF Generator Service Adapter
 * Implements IPDFGeneratorService using the existing PDFGenerator
 */

import fs from 'fs/promises';
import path from 'path';
import { generateTaxReturnPDF } from '@services/pdf-generator';
import { getStoragePath } from '@config/storage';
import {
  IPDFGeneratorService,
  PDFGenerationOptions,
  PDFGenerationResult
} from '@core/application/services/IPDFGeneratorService';
import { env } from '@config/env';

export class PDFGeneratorService implements IPDFGeneratorService {
  async generateTaxPDF(
    taxData: any,
    taxYear: number,
    options?: PDFGenerationOptions
  ): Promise<PDFGenerationResult> {
    // Generate PDF buffer
    const pdfBuffer = await generateTaxReturnPDF(taxData);

    // Save to file
    const filesPath = getStoragePath('files');
    const fileName = `Tax_Return_${taxYear}_${Date.now()}.pdf`;
    const filePath = path.join(filesPath, fileName);

    await fs.mkdir(filesPath, { recursive: true });
    await fs.writeFile(filePath, pdfBuffer);

    // Get file stats
    const stats = await fs.stat(filePath);

    return {
      filePath,
      fileName,
      size: stats.size,
      url: `${env.BASE_URL}/files/${fileName}`,
    };
  }

  async generatePDF(
    content: string,
    title: string,
    options?: PDFGenerationOptions
  ): Promise<PDFGenerationResult> {
    // Not implemented yet - would create a generic PDF generator
    throw new Error('Generic PDF generation not implemented yet');
  }
}
