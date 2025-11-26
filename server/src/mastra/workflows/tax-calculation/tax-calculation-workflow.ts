/**
 * Tax Calculation Workflow with Human-in-the-Loop
 * Multi-step workflow that suspends for user input at each stage
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { fileService } from '@infrastructure/services/document/file-service.class';
import { generateTaxReturnPDF } from '@infrastructure/services/document/pdf-generator';
import { WORKFLOW_IDS, WORKFLOW_STEPS } from '@shared/constants/workflow';
import { extractTaxData, type DocumentWithText } from '@domains/tax-extraction/tax-data-extraction.service';
import { mongoRepository } from '@infrastructure/database/base-repository';

// === SCHEMA DEFINITIONS ===

// Personal information schema
const personalInfoSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.string().optional(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']),
  numberOfChildren: z.number().default(0),
  canton: z.string().default('zurich'),
  municipality: z.string().optional(),
  taxYear: z.number().default(new Date().getFullYear() - 1),
});

// Document upload schema
const documentSchema = z.object({
  documents: z.array(z.object({
    fileId: z.string(),
    fileName: z.string(),
    fileType: z.string(),
    extractedText: z.string().optional(),
  })),
});

// Extracted data review schema
const extractedDataSchema = z.object({
  income: z.object({
    employment: z.number().default(0),
    selfEmployment: z.number().default(0),
    investments: z.number().default(0),
    rental: z.number().default(0),
    other: z.number().default(0),
  }),
  deductions: z.object({
    professionalExpenses: z.number().default(0),
    insurance: z.number().default(0),
    pillar3a: z.number().default(0),
    childcare: z.number().default(0),
    education: z.number().default(0),
    donations: z.number().default(0),
    other: z.number().default(0),
  }),
  wealth: z.object({
    bankAccounts: z.number().default(0),
    securities: z.number().default(0),
    realEstate: z.number().default(0),
    vehicles: z.number().default(0),
    other: z.number().default(0),
  }),
  confirmed: z.boolean().default(false),
});

// Calculation result schema
const calculationResultSchema = z.object({
  grossIncome: z.number(),
  totalDeductions: z.number(),
  taxableIncome: z.number(),
  estimatedTax: z.number(),
  taxRate: z.number(),
  recommendations: z.array(z.string()),
});

// Final summary schema
const summarySchema = z.object({
  pdfGenerated: z.boolean(),
  pdfUrl: z.string().optional(),
  summary: z.string(),
});

// === WORKFLOW STEPS ===

/**
 * Step 1: Collect Personal Information
 * Suspends to wait for user to provide their personal details
 */
const collectPersonalInfoStep = createStep({
  id: WORKFLOW_STEPS.COLLECT_PERSONAL_INFO,
  inputSchema: z.object({
    threadId: z.string(),
    message: z.string().optional().nullable(),
  }),
  outputSchema: personalInfoSchema,
  resumeSchema: personalInfoSchema,
  suspendSchema: z.object({
    reason: z.string(),
    requiredFields: z.array(z.string()),
  }),
  execute: async ({ resumeData, suspend }) => {
    console.log("============= Inside collectPersonalInfoStep.");
    // Check if we have resume data with personal info
    if (resumeData) {
      console.log('[Workflow] Personal info received:', resumeData);
      return resumeData;
    }

    // Suspend and wait for user input
    console.log('[Workflow] Suspending for personal info collection');
    return await suspend({
      reason: 'Please provide your personal information to begin tax calculation',
      requiredFields: [
        'firstName',
        'lastName',
        'maritalStatus',
        'numberOfChildren',
        'taxYear',
      ],
    });
  },
});

/**
 * Step 2: Upload Documents
 * Suspends to wait for user to upload their tax documents
 */
const uploadDocumentsStep = createStep({
  id: WORKFLOW_STEPS.UPLOAD_DOCUMENTS,
  inputSchema: personalInfoSchema,
  outputSchema: z.object({
    personalInfo: personalInfoSchema,
    documents: documentSchema.shape.documents,
  }),
  resumeSchema: documentSchema,
  suspendSchema: z.object({
    reason: z.string(),
    acceptedFormats: z.array(z.string()),
    suggestedDocuments: z.array(z.string()),
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    console.log("============= Inside uploadDocumentsStep.");
    if (resumeData && resumeData.documents.length > 0) {
      console.log('[Workflow] Documents received:', resumeData.documents.length);
      return {
        personalInfo: inputData,
        documents: resumeData.documents,
      };
    }

    // Suspend and wait for document upload
    console.log('[Workflow] Suspending for document upload');
    return await suspend({
      reason: 'Please upload your tax documents for processing',
      acceptedFormats: ['PDF', 'JPG', 'PNG', 'TIFF'],
      suggestedDocuments: [
        'Lohnausweis (Salary certificate)',
        'Bank statements',
        'Insurance certificates',
        'Pillar 3a confirmation',
        'Donation receipts',
        'Professional expense receipts',
      ],
    });
  },
});

/**
 * Step 3: Review Extracted Data
 * Expects documents to have been OCR'd by the process-documents tool (extractedText field populated).
 * This step internally uses AI to extract structured tax data from the OCR'd text.
 * No separate tool call needed - extraction happens within the workflow step itself.
 * Suspends to show extracted data and wait for user confirmation/corrections.
 */
const reviewExtractedDataStep = createStep({
  id: WORKFLOW_STEPS.REVIEW_EXTRACTED_DATA,
  inputSchema: z.object({
    personalInfo: personalInfoSchema,
    documents: documentSchema.shape.documents,
  }),
  outputSchema: z.object({
    personalInfo: personalInfoSchema,
    taxData: extractedDataSchema,
  }),
  resumeSchema: extractedDataSchema,
  suspendSchema: z.object({
    reason: z.string(),
    extractedData: extractedDataSchema,
    canEdit: z.boolean(),
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    console.log("============= Inside reviewExtractedDataStep.");
    if (resumeData && resumeData.confirmed) {
      console.log('[Workflow] Extracted data confirmed by user');
      return {
        personalInfo: inputData.personalInfo,
        taxData: resumeData,
      };
    }

    // Extract structured tax data from documents using AI
    // This happens internally in the workflow step - no separate tool call needed
    // The AI agent should have already called process-documents tool to OCR the files
    console.log('[Workflow] Extracting tax data from documents using AI...');

    // Fetch latest OCR data from MongoDB (in case process-documents was called after workflow started)
    const documentsWithText: DocumentWithText[] = [];
    for (const doc of inputData.documents) {
      // Try to get from workflow data first
      if (doc.extractedText && doc.extractedText.trim().length > 0) {
        documentsWithText.push({
          fileName: doc.fileName,
          extractedText: doc.extractedText,
        });
      } else {
        // Fetch from MongoDB in case it was processed after workflow started
        const fileMetadata = await mongoRepository.findFileById(doc.fileId);
        if (fileMetadata?.ocrResult?.text && fileMetadata.ocrResult.text.trim().length > 0) {
          console.log(`[Workflow] Fetched OCR text from DB for: ${doc.fileName}`);
          documentsWithText.push({
            fileName: doc.fileName,
            extractedText: fileMetadata.ocrResult.text,
          });
        }
      }
    }

    if (documentsWithText.length === 0) {
      console.error('[Workflow] No documents with extracted text found. Documents must be processed with OCR first.');

      // Return error payload that tells user/agent to process documents first
      const emptyData: z.infer<typeof extractedDataSchema> = {
        income: { employment: 0, selfEmployment: 0, investments: 0, rental: 0, other: 0 },
        deductions: { professionalExpenses: 0, insurance: 0, pillar3a: 0, childcare: 0, education: 0, donations: 0, other: 0 },
        wealth: { bankAccounts: 0, securities: 0, realEstate: 0, vehicles: 0, other: 0 },
        confirmed: false,
      };

      return await suspend({
        reason: 'Documents have not been processed with OCR yet. Please call process-documents tool on the uploaded files first, then resume the workflow. Cannot extract tax data without OCR text.',
        extractedData: emptyData,
        canEdit: true,
      });
    }

    console.log(`[Workflow] Found ${documentsWithText.length} documents with text for extraction`);

    // Extract structured data using AI with personal info context
    // This uses the shared tax-data-extraction service internally
    const taxData = await extractTaxData(documentsWithText, {
      canton: inputData.personalInfo.canton,
      taxYear: inputData.personalInfo.taxYear,
      numberOfChildren: inputData.personalInfo.numberOfChildren,
      maritalStatus: inputData.personalInfo.maritalStatus,
    });

    const extractedData: z.infer<typeof extractedDataSchema> = {
      ...taxData,
      confirmed: false,
    };

    console.log('[Workflow] AI extraction completed, suspending for user review');
    return await suspend({
      reason: 'Please review the extracted data and make any corrections',
      extractedData,
      canEdit: true,
    });
  },
});

/**
 * Step 4: Calculate Deductions and Tax
 * Performs tax calculation based on confirmed data
 */
const calculateTaxStep = createStep({
  id: WORKFLOW_STEPS.CALCULATE_TAX,
  inputSchema: z.object({
    personalInfo: personalInfoSchema,
    taxData: extractedDataSchema,
  }),
  outputSchema: z.object({
    personalInfo: personalInfoSchema,
    taxData: extractedDataSchema,
    calculation: calculationResultSchema,
  }),
  execute: async ({ inputData }) => {
    console.log("============= Inside calculateTaxStep.");
    const { personalInfo, taxData } = inputData;

    // Calculate totals
    const grossIncome = Object.values(taxData.income).reduce((a, b) => a + b, 0);
    const totalDeductions = Object.values(taxData.deductions).reduce((a, b) => a + b, 0);
    const taxableIncome = Math.max(0, grossIncome - totalDeductions);

    // Simplified Zurich tax calculation (actual rates are more complex)
    // Using progressive rate approximation
    let taxRate: number;
    if (taxableIncome <= 30000) {
      taxRate = 0.05;
    } else if (taxableIncome <= 60000) {
      taxRate = 0.10;
    } else if (taxableIncome <= 100000) {
      taxRate = 0.15;
    } else if (taxableIncome <= 200000) {
      taxRate = 0.20;
    } else {
      taxRate = 0.25;
    }

    const estimatedTax = Math.round(taxableIncome * taxRate);

    // Generate recommendations
    const recommendations: string[] = [];

    if (taxData.deductions.pillar3a < 7056) {
      recommendations.push(
        `Consider maximizing your Pillar 3a contribution. You can still contribute CHF ${7056 - taxData.deductions.pillar3a} more.`
      );
    }

    if (personalInfo.numberOfChildren > 0 && taxData.deductions.childcare === 0) {
      recommendations.push(
        'You may be eligible for childcare deductions. Keep receipts for daycare or nanny expenses.'
      );
    }

    if (taxData.deductions.professionalExpenses < 4000) {
      recommendations.push(
        'Review your professional expenses. You may be able to claim more for work-related costs.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Your tax situation appears well optimized. Great job!');
    }

    console.log('[Workflow] Tax calculation completed');

    return {
      personalInfo,
      taxData,
      calculation: {
        grossIncome,
        totalDeductions,
        taxableIncome,
        estimatedTax,
        taxRate: Math.round(taxRate * 100),
        recommendations,
      },
    };
  },
});

/**
 * Step 5: Generate Summary
 * Suspends for final confirmation before generating PDF
 */
const generateSummaryStep = createStep({
  id: WORKFLOW_STEPS.GENERATE_SUMMARY,
  inputSchema: z.object({
    personalInfo: personalInfoSchema,
    taxData: extractedDataSchema,
    calculation: calculationResultSchema,
  }),
  outputSchema: summarySchema,
  resumeSchema: z.object({
    generatePdf: z.boolean(),
  }),
  suspendSchema: z.object({
    reason: z.string(),
    calculation: calculationResultSchema,
    canGeneratePdf: z.boolean(),
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    console.log("============= Inside generateSummaryStep.");
    if (resumeData) {
      const { calculation, personalInfo } = inputData;

      if (resumeData.generatePdf) {
        console.log('[Workflow] Generating PDF summary');

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

        // Save PDF using fileService for consistent URL handling
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
    console.log('[Workflow] Suspending for final confirmation');
    return await suspend({
      reason: 'Review your tax calculation and confirm to generate PDF summary',
      calculation: inputData.calculation,
      canGeneratePdf: true,
    });
  },
});

// === WORKFLOW DEFINITION ===

export const taxCalculationWorkflow = createWorkflow({
  id: WORKFLOW_IDS.TAX_CALCULATION,
  inputSchema: z.object({
    threadId: z.string(),
    message: z.string().optional().nullable(),
  }),
  outputSchema: summarySchema,
})
  .then(collectPersonalInfoStep)
  .then(uploadDocumentsStep)
  .then(reviewExtractedDataStep)
  .then(calculateTaxStep)
  .then(generateSummaryStep)
  .commit();
