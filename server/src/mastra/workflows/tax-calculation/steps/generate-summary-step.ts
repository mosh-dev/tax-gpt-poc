import { WORKFLOW_STEPS } from '@shared/constants/workflow';
import { z } from 'zod';
import {
  taxCalculationWorkflowSchema
} from '@/mastra/workflows/tax-calculation/schemas/tax-calculation-workflow.schema';
import { createStep } from '@mastra/core/workflows';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { AgentLoggerService } from '@infrastructure/ai/agent-logger.service';
import { generateTaxReturnPDF } from '@domains/document/services/pdf-generator';
import { FileService } from '@domains/document/services/file.service';

/**
 * Step 5: Generate Summary
 * Suspends for final confirmation before generating PDF
 */
export const generateSummaryStep = createStep({
  id: WORKFLOW_STEPS.GENERATE_SUMMARY,
  inputSchema: z.object({
    personalInfo: taxCalculationWorkflowSchema.personalInfoSchema,
    taxData: taxCalculationWorkflowSchema.extractedDataSchema,
    calculation: taxCalculationWorkflowSchema.calculationResultSchema,
  }),
  outputSchema: taxCalculationWorkflowSchema.summarySchema,
  resumeSchema: z.object({
    generatePdf: z.boolean(),
  }),
  suspendSchema: z.object({
    reason: z.string(),
    calculation: taxCalculationWorkflowSchema.calculationResultSchema,
    canGeneratePdf: z.boolean(),
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    const logger = injectFromContainer(AgentLoggerService);
    if (resumeData) {
      const { calculation, personalInfo } = inputData;

      if (resumeData.generatePdf) {
        logger.log('[Workflow] Generating PDF summary');

        // Build tax data structure for PDF generator
        const taxDataForPdf = {
          taxYear: personalInfo.taxYear,
          personalInfo: {
            firstName: personalInfo.firstName,
            lastName: personalInfo.lastName,
            dateOfBirth: personalInfo.dateOfBirth || '',
            address: personalInfo.municipality || '',
            municipality: personalInfo.municipality || personalInfo.canton,
            maritalStatus: personalInfo.maritalStatus,
          },
          income: {
            employment: inputData.taxData.income.employment,
            selfEmployment: inputData.taxData.income.selfEmployment,
            investments: inputData.taxData.income.investments,
            rental: inputData.taxData.income.rental,
            other: inputData.taxData.income.other,
          },
          deductions: {
            professionalExpenses: inputData.taxData.deductions.professionalExpenses,
            healthcareExpenses: 0,
            pillar3a: inputData.taxData.deductions.pillar3a,
            childcare: inputData.taxData.deductions.childcare,
            education: inputData.taxData.deductions.education,
            commuting: 0,
            donations: inputData.taxData.deductions.donations,
          },
          wealth: {
            bankAccounts: inputData.taxData.wealth.bankAccounts,
            securities: inputData.taxData.wealth.securities,
            realEstate: inputData.taxData.wealth.realEstate,
            other: inputData.taxData.wealth.other + inputData.taxData.wealth.vehicles,
          },
        };

        // Generate actual PDF using PDF generator service
        const pdfBuffer = await generateTaxReturnPDF(taxDataForPdf);

        // Save PDF using FileService from container for consistent URL handling
        const fileService = injectFromContainer(FileService);
        const filename = `Tax_Return_${personalInfo.lastName}_${personalInfo.taxYear}_${Date.now()}.pdf`;
        const savedFile = await fileService.saveGeneratedFile(
          pdfBuffer,
          filename,
          'application/pdf'
        );

        const summary = `Tax return PDF generated for ${personalInfo.firstName} ${personalInfo.lastName} (Tax Year ${personalInfo.taxYear}). ` +
          `Gross Income: CHF ${calculation.grossIncome.toLocaleString()}, ` +
          `Deductions: CHF ${calculation.totalDeductions.toLocaleString()}, ` +
          `Estimated Tax: CHF ${calculation.estimatedTax.toLocaleString()}`;

        return {
          pdfGenerated: true,
          pdfUrl: savedFile.url,
          summary,
        };
      }

      return {
        pdfGenerated: false,
        summary: 'Tax calculation completed without PDF generation.',
      };
    }

    // Suspend for final confirmation
    logger.log('[Workflow] Suspending for final confirmation');
    return await suspend({
      reason: 'Review your tax calculation and confirm to generate PDF summary',
      calculation: inputData.calculation,
      canGeneratePdf: true,
    });
  },
});
