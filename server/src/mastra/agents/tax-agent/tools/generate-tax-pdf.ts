import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { generateTaxReturnPDF } from '@domains/document/pdf-generator';
import { fileService } from '@domains/document/file-service';
import { SwissTaxData } from '@domains/tax-extraction/swiss-tax-data.model';
import { TOOL_IDS } from '@shared/constants/tool-ids';

/**
 * Tool to generate a PDF document of calculated tax data
 * Creates a comprehensive tax return summary PDF for Canton Zurich
 */
export const generateTaxPDFTool = createTool({
  id: TOOL_IDS.GENERATE_TAX_PDF,
  description: 'Generates a PDF document containing a comprehensive tax return summary with income, deductions, and wealth information for Canton Zurich In English. Use this when the user asks to generate, create, or download a PDF of their tax data or tax return summary. And Use English Language. IMPORTANT: When presenting the result to the user, format the download link as markdown: [fileName](downloadUrl). Never show raw URLs.',
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
    fileName: z.string().optional().describe('Cus filename for the PDF (without extension)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    fileName: z.string().optional(),
    filePath: z.string().optional(),
    downloadUrl: z.string().optional(),
    message: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ taxData, fileName }) => {
    try {
      // Generate the PDF buffer
      const pdfBuffer = await generateTaxReturnPDF(taxData as SwissTaxData);

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const pdfFileName = fileName
        ? `${fileName}_${timestamp}.pdf`
        : `Tax_Return_${taxData.personalInfo.lastName}_${taxData.taxYear}_${timestamp}.pdf`;

      // Save PDF using fileService for consistent URL handling
      const savedFile = await fileService.saveGeneratedFile(
        pdfBuffer,
        pdfFileName,
        'application/pdf'
      );

      // Calculate file size
      const fileSizeKB = (pdfBuffer.length / 1024).toFixed(2);

      return {
        success: true,
        fileName: savedFile.originalName,
        filePath: savedFile.storedPath,
        downloadUrl: savedFile.url,
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
