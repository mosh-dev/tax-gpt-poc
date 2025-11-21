import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Tool to calculate potential tax deductions for Canton Zurich
 */
export const calculateDeductionsTool = createTool({
  id: 'calculate-deductions',
  description: `Calculates potential tax deductions for Canton Zurich based on income and expenses.

USE THIS WHEN:
- User asks about "deductions I can claim" or "what can I deduct"
- User wants to "optimize my taxes" or "reduce my tax burden"
- User asks "how to save on taxes" through deductions
- User wants a deduction calculation or breakdown

WHAT IT CALCULATES:
- Professional Expenses (3% of income cap) - work-related costs, home office, equipment
- Healthcare Costs (deductible above 5% of income threshold) - medical expenses, insurance
- Pension Contributions (CHF 7,056 cap for Pillar 3a in 2025) - retirement savings
- Childcare Costs (no specific cap) - daycare, after-school care
- Commuting Costs (CHF 3,600 cap) - travel between home and work, public transport

CANTON ZURICH RULES APPLIED:
- Professional expenses capped at 3% of gross income
- Healthcare only deductible above 5% of income threshold
- Pillar 3a contributions limited to CHF 7,056 (2025 limit)
- Commuting expenses capped at approximately CHF 3,600
- Estimated tax savings based on ~20% average tax rate

INPUT REQUIREMENTS:
- income: Total annual income in CHF (required)
- All expense categories optional (professionalExpenses, healthcareCosts, pensionContributions, childcareCosts, commutingCosts)

OUTPUT:
- totalDeductions: Sum of all eligible deductions in CHF
- breakdown: Detailed amounts by category (professional, healthcare, pension, childcare, commuting)
- recommendations: Personalized suggestions to maximize deductions (e.g., "Consider maximizing Pillar 3a contributions")
- estimatedTaxSavings: Approximate tax savings from deductions (assumes 20% effective rate)`,
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
  execute: async ({
    income,
    professionalExpenses = 0,
    healthcareCosts = 0,
    pensionContributions = 0,
    childcareCosts = 0,
    commutingCosts = 0,
  }) => {

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
