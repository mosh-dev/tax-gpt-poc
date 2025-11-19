import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Employee } from '../../models';

/**
 * Tool to retrieve Swiss tax data for different scenarios
 * Fetches employee tax information from the database
 */
export const getTaxDataTool = createTool({
  id: 'get-tax-data',
  description: 'Retrieves Swiss tax data for Canton Zurich based on a scenario. Available scenarios include: single (single employee), married (married couple), freelancer (self-employed), retiree (retired person), and young-professional (entry-level employee). Use this tool when the user asks for their tax data, wants to load their tax information, or needs to see their current tax situation.',
  inputSchema: z.object({
    scenario: z.string().describe('The tax scenario to retrieve (e.g., single, married, freelancer, retiree, young-professional)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: z.any().optional(),
    scenario: z.string(),
    availableScenarios: z.array(z.string()).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ scenario }) => {
    console.log({ scenario });
    try {
      // Get employee data from database for the requested scenario
      const employee = await Employee.findOne({ scenarioId: scenario, isActive: true });

      if (!employee) {
        // Get list of available scenarios
        const available = await Employee.find({ isActive: true }).select('scenarioId');
        const availableScenarios = available.map(e => e.scenarioId);

        return {
          success: false,
          scenario,
          availableScenarios,
          error: `Tax data not found for scenario: ${scenario}. Available scenarios: ${availableScenarios.join(', ')}`,
        };
      }

      return {
        success: true,
        data: employee.taxData,
        scenario,
      };
    } catch (error: any) {
      return {
        success: false,
        scenario,
        error: error.message || 'Failed to retrieve tax data',
      };
    }
  },
});
