// === SCHEMA DEFINITIONS ===

// Personal information schema
import { z } from 'zod';

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

export const taxCalculationWorkflowSchema = {
  personalInfoSchema,
  documentSchema,
  extractedDataSchema,
  calculationResultSchema,
  summarySchema
}
