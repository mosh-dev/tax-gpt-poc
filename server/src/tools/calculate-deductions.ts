import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Tool to calculate potential tax deductions for Canton Zurich
 */
export const calculateDeductionsTool = createTool({
  id: 'calculate-deductions',
  description: 'Calculates potential tax deductions for Canton Zurich based on income and expenses. Use this when the user wants to know what deductions they can claim or optimize their tax situation.',
  inputSchema: z.object({
    income: z.number().describe('Total annual income in CHF'),
    professionalExpenses: z.number().optional().describe('Professional expenses in CHF'),
    healthcareCosts: z.number().optional().describe('Healthcare and insurance costs in CHF'),
    pensionContributions: z.number().optional().describe('Pillar 2 and 3a pension contributions in CHF'),
    childcareCosts: z.number().optional().describe('Childcare costs in CHF'),
    commutingCosts: z.number().optional().describe('Commuting expenses in CHF'),
  }),
  outputSchema: z.object({
    totalDeductions: z.number(),
    breakdown: z.object({
      professional: z.number(),
      healthcare: z.number(),
      pension: z.number(),
      childcare: z.number(),
      commuting: z.number(),
    }),
    recommendations: z.array(z.string()),
    estimatedTaxSavings: z.number(),
  }),
  execute: async ({ context }) => {
    const {
      income,
      professionalExpenses = 0,
      healthcareCosts = 0,
      pensionContributions = 0,
      childcareCosts = 0,
      commutingCosts = 0,
    } = context;

    const recommendations: string[] = [];

    // Canton Zurich deduction rules (simplified)
    const maxProfessionalExpenses = Math.min(professionalExpenses, income * 0.03); // 3% of income, capped
    const maxHealthcareDeduction = Math.max(0, healthcareCosts - income * 0.05); // Above 5% of income
    const maxPensionDeduction = Math.min(pensionContributions, 7056); // 2025 Pillar 3a limit
    const maxChildcareDeduction = childcareCosts; // No specific cap mentioned
    const maxCommutingDeduction = Math.min(commutingCosts, 3600); // Approximate cap

    const totalDeductions =
      maxProfessionalExpenses +
      maxHealthcareDeduction +
      maxPensionDeduction +
      maxChildcareDeduction +
      maxCommutingDeduction;

    // Generate recommendations
    if (pensionContributions < 7056) {
      const remaining = 7056 - pensionContributions;
      recommendations.push(`Consider maximizing your Pillar 3a contributions. You can still contribute CHF ${remaining.toFixed(2)} this year.`);
    }

    if (professionalExpenses < income * 0.03) {
      recommendations.push('Track your professional expenses carefully. You can deduct work-related costs like home office, professional literature, and equipment.');
    }

    if (commutingCosts > 0 && commutingCosts < 3600) {
      recommendations.push('Ensure you claim all commuting costs between home and work. Public transport season tickets are fully deductible.');
    }

    if (healthcareCosts < income * 0.05) {
      recommendations.push('Healthcare costs are only deductible above 5% of your income. Consider timing large medical expenses strategically.');
    }

    // Estimate tax savings (assuming ~20% average tax rate for Canton Zurich)
    const estimatedTaxSavings = totalDeductions * 0.20;

    return {
      totalDeductions: Math.round(totalDeductions),
      breakdown: {
        professional: Math.round(maxProfessionalExpenses),
        healthcare: Math.round(maxHealthcareDeduction),
        pension: Math.round(maxPensionDeduction),
        childcare: Math.round(maxChildcareDeduction),
        commuting: Math.round(maxCommutingDeduction),
      },
      recommendations,
      estimatedTaxSavings: Math.round(estimatedTaxSavings),
    };
  },
});
