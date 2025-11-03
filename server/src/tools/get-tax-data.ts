import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getMockTaxData } from '../services/mock-data';

/**
 * Tool to retrieve Swiss tax data for different scenarios
 * This simulates fetching user's tax information from a database or API
 */
export const getTaxDataTool = createTool({
  id: 'get-tax-data',
  description: 'Retrieves Swiss tax data for Canton Zurich based on a scenario (single, married, or freelancer). Use this tool when the user asks for their tax data, wants to load their tax information, or needs to see their current tax situation.',
  inputSchema: z.object({
    scenario: z.enum(['single', 'married', 'freelancer']).describe('The tax scenario to retrieve: single (single person), married (married couple), or freelancer (self-employed)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: z.any().optional(),
    scenario: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
      console.log({context});
    try {
      const { scenario } = context;

      // Get mock data for the requested scenario
      const taxData = getMockTaxData(scenario);

      if (!taxData) {
        return {
          success: false,
          scenario,
          error: `Tax data not found for scenario: ${scenario}`,
        };
      }

      return {
        success: true,
        data: taxData,
        scenario,
      };
    } catch (error: any) {
      return {
        success: false,
        scenario: context.scenario,
        error: error.message || 'Failed to retrieve tax data',
      };
    }
  },
});
