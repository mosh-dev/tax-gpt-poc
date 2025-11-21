import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { generateTaxReturnPDF } from '../../services/pdf-generator';
import { SwissTaxData } from '../../types';
import { fileService } from '../../services/file-service';

/**
 * Tool to generate a PDF document of calculated tax data
 * Creates a comprehensive tax return summary PDF for Canton Zurich
 */
export const generateTaxPDFTool = createTool({
  id: 'generate-tax-pdf',
  description: `Generates a PDF document containing a comprehensive tax return summary with income, deductions, and wealth information for Canton Zurich.

USE THIS WHEN:
- User asks to "generate PDF", "create document", "download summary"
- User wants "a PDF of their tax data" or "tax return summary"
- User wants to "get a PDF" of their tax calculation
- Workflow completes and user wants final PDF output

PDF CONTENTS:
- Personal Information (name, address, marital status, tax year)
- Income Summary (employment, self-employment, investments, rental, other)
- Deductions Breakdown (professional, healthcare, Pillar 3a, childcare, education, commuting, donations)
- Wealth Declaration (bank accounts, securities, real estate, other assets)
- Taxable Income Calculation (total income minus deductions)

LANGUAGE:
- PDF is always generated in English (optimized for readability and international use)

INPUT REQUIREMENTS:
- taxData: Complete Swiss tax data object with all required fields
  - taxYear: The tax year (e.g., 2024)
  - personalInfo: firstName, lastName, dateOfBirth, address, municipality, maritalStatus
  - income: employment, selfEmployment, investments, rental, other (all optional)
  - deductions: professionalExpenses, healthcareExpenses, pillar3a, childcare, education, commuting, donations (all optional)
  - wealth: bankAccounts, securities, realEstate, other (optional)
- fileName (optional): Custom filename without extension (timestamp will be appended automatically)

OUTPUT:
- success: Boolean indicating generation success
- fileName: Generated filename (includes timestamp)
- filePath: Server-side storage path
- downloadUrl: Public URL for downloading the PDF
- message: Human-readable success message with file size
- error: Error message if generation fails`,
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
