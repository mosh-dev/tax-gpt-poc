/**
 * Tax Calculation Workflow with Human-in-the-Loop
 * Multi-step workflow that suspends for user input at each stage
 */

import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { WORKFLOW_IDS, WORKFLOW_STEPS } from '../../constants';

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
    message: z.string().optional(),
  }),
  outputSchema: personalInfoSchema,
  resumeSchema: personalInfoSchema,
  suspendSchema: z.object({
    reason: z.string(),
    requiredFields: z.array(z.string()),
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
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
 * Shows extracted data from documents and suspends for user confirmation
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
    if (resumeData && resumeData.confirmed) {
      console.log('[Workflow] Extracted data confirmed by user');
      return {
        personalInfo: inputData.personalInfo,
        taxData: resumeData,
      };
    }

    // Process documents and extract data (simulated for now)
    // In real implementation, this would call OCR and AI extraction
    const extractedData: z.infer<typeof extractedDataSchema> = {
      income: {
        employment: 85000,
        selfEmployment: 0,
        investments: 2500,
        rental: 0,
        other: 0,
      },
      deductions: {
        professionalExpenses: 3000,
        insurance: 2400,
        pillar3a: 7056,
        childcare: 0,
        education: 500,
        donations: 200,
        other: 0,
      },
      wealth: {
        bankAccounts: 45000,
        securities: 15000,
        realEstate: 0,
        vehicles: 8000,
        other: 0,
      },
      confirmed: false,
    };

    console.log('[Workflow] Suspending for data review');
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
    if (resumeData) {
      const { calculation, personalInfo } = inputData;

      if (resumeData.generatePdf) {
        // Generate PDF (placeholder - would call actual PDF generation)
        console.log('[Workflow] Generating PDF summary');

        const summary = `
# Tax Return Summary ${personalInfo.taxYear}

## Personal Information
- Name: ${personalInfo.firstName} ${personalInfo.lastName}
- Marital Status: ${personalInfo.maritalStatus}
- Canton: ${personalInfo.canton}

## Financial Summary
- Gross Income: CHF ${calculation.grossIncome.toLocaleString()}
- Total Deductions: CHF ${calculation.totalDeductions.toLocaleString()}
- Taxable Income: CHF ${calculation.taxableIncome.toLocaleString()}

## Tax Estimate
- Estimated Tax: CHF ${calculation.estimatedTax.toLocaleString()}
- Effective Tax Rate: ${calculation.taxRate}%

## Recommendations
${calculation.recommendations.map(r => `- ${r}`).join('\n')}
        `.trim();

        return {
          pdfGenerated: true,
          pdfUrl: `/files/Tax_Return_${personalInfo.taxYear}_${Date.now()}.pdf`,
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
    message: z.string().optional(),
  }),
  outputSchema: summarySchema,
})
  .then(collectPersonalInfoStep)
  .then(uploadDocumentsStep)
  .then(reviewExtractedDataStep)
  .then(calculateTaxStep)
  .then(generateSummaryStep)
  .commit();

// Export types for use in routes
export type PersonalInfo = z.infer<typeof personalInfoSchema>;
export type DocumentData = z.infer<typeof documentSchema>;
export type ExtractedData = z.infer<typeof extractedDataSchema>;
export type CalculationResult = z.infer<typeof calculationResultSchema>;
export type WorkflowSummary = z.infer<typeof summarySchema>;