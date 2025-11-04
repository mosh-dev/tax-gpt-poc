import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { generateTaxReturnPDF } from '../services/pdf-generator';
import { SwissTaxData } from '../types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Tool to generate a PDF document of calculated tax data
 * Creates a comprehensive tax return summary PDF for Canton Zurich
 */
export const generateTaxPDFTool = createTool({
  id: 'generate-tax-pdf',
  description: 'Generates a PDF document containing a comprehensive tax return summary with income, deductions, and wealth information for Canton Zurich In English. Use this when the user asks to generate, create, or download a PDF of their tax data or tax return summary. And Use English Language',
  inputSchema: z.object({
    taxData: z.object({
      taxYear: z.number(),
      personalInfo: z.object({
        firstName: z.string(),
        lastName: z.string(),
        dateOfBirth: z.string(),
        address: z.string(),
        municipality: z.string(),
        maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']),
      }),
      income: z.object({
        employment: z.number().optional(),
        selfEmployment: z.number().optional(),
        investments: z.number().optional(),
        rental: z.number().optional(),
        other: z.number().optional(),
      }),
      deductions: z.object({
        professionalExpenses: z.number().optional(),
        healthcareExpenses: z.number().optional(),
        pillar3a: z.number().optional(),
        childcare: z.number().optional(),
        education: z.number().optional(),
        commuting: z.number().optional(),
        donations: z.number().optional(),
      }),
      wealth: z.object({
        bankAccounts: z.number().optional(),
        securities: z.number().optional(),
        realEstate: z.number().optional(),
        other: z.number().optional(),
      }).optional(),
    }).describe('The Swiss tax data to generate the PDF from'),
    fileName: z.string().optional().describe('Optional custom filename for the PDF (without extension)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    fileName: z.string().optional(),
    filePath: z.string().optional(),
    downloadUrl: z.string().optional(),
    message: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { taxData, fileName } = context;

      // Generate the PDF buffer
      const pdfBuffer = await generateTaxReturnPDF(taxData as SwissTaxData);

      // Create output directory if it doesn't exist
      // When running from dist/tools/, go up two levels to dist, then to server/generated-pdfs
      const outputDir = path.join(__dirname, '../../../server/generated-pdfs');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const pdfFileName = fileName
        ? `${fileName}_${timestamp}.pdf`
        : `Tax_Return_${taxData.personalInfo.lastName}_${taxData.taxYear}_${timestamp}.pdf`;

      const filePath = path.join(outputDir, pdfFileName);

      // Save PDF to file
      fs.writeFileSync(filePath, pdfBuffer);

      // Calculate file size
      const fileSizeKB = (pdfBuffer.length / 1024).toFixed(2);

      return {
        success: true,
        fileName: pdfFileName,
        filePath: filePath,
        downloadUrl: `http://localhost:3000/downloads/${pdfFileName}`,
        message: `Successfully generated tax return PDF for ${taxData.personalInfo.firstName} ${taxData.personalInfo.lastName} (Tax Year ${taxData.taxYear}). File size: ${fileSizeKB} KB. The PDF includes income summary, deductions, wealth declaration, and taxable income calculation.`,
      };
    } catch (error: any) {
      console.error('PDF Generation Error:', error);
      return {
        success: false,
        message: 'Failed to generate PDF document',
        error: error.message || 'Unknown error occurred during PDF generation',
      };
    }
  },
});
