import { createStep } from '@mastra/core/workflows';
import { WORKFLOW_STEPS } from '@shared/constants/workflow';
import {
  taxCalculationWorkflowSchema
} from '@/mastra/workflows/tax-calculation/schemas/tax-calculation-workflow.schema';
import { z } from 'zod';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { AgentLoggerService } from '@infrastructure/ai/agent-logger.service';


/**
 * Step 4: Calculate Deductions and Tax
 * Performs tax calculation based on confirmed data
 */
export const calculateTaxStep = createStep({
  id: WORKFLOW_STEPS.CALCULATE_TAX,
  inputSchema: z.object({
    personalInfo: taxCalculationWorkflowSchema.personalInfoSchema,
    taxData: taxCalculationWorkflowSchema.extractedDataSchema,
  }),
  outputSchema: z.object({
    personalInfo: taxCalculationWorkflowSchema.personalInfoSchema,
    taxData: taxCalculationWorkflowSchema.extractedDataSchema,
    calculation: taxCalculationWorkflowSchema.calculationResultSchema,
  }),
  execute: async ({ inputData }) => {
    const logger = injectFromContainer(AgentLoggerService);
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

    logger.log('[Workflow] Tax calculation completed');

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
