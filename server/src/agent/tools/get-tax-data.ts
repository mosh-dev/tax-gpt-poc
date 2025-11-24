import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Employee } from '@models/employee.model';

/**
 * Tool to retrieve Swiss tax data by searching employee name
 * Fetches employee tax information from the database
 */
export const getTaxDataTool = createTool({
  id: 'get-tax-data',
  description: 'Retrieves Swiss tax data by searching for an employee by name. Use this tool when the user asks for their tax data, wants to load their tax information, or needs to see their current tax situation. First search by name, then if multiple results are found, present them to the user to choose.',
  inputSchema: z.object({
    searchName: z.string().optional().describe('Name to search for (searches both first and last name). Leave empty to list all available profiles.'),
    employeeId: z.string().optional().describe('Specific employee ID to retrieve (use this when user has selected from multiple results)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: z.any().optional(),
    searchName: z.string().optional(),
    multipleResults: z.array(z.object({
      id: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      scenarioName: z.string(),
    })).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ searchName, employeeId }) => {
    console.log({ searchName, employeeId });
    try {
      // If employeeId is provided, fetch that specific employee
      if (employeeId) {
        const employee = await Employee.findById(employeeId);
        if (!employee) {
          return {
            success: false,
            error: `Employee not found with ID: ${employeeId}`,
          };
        }
        return {
          success: true,
          data: employee.taxData,
        };
      }

      // Search by name using regex
      let query: any = { isActive: true };

      if (searchName && searchName.trim()) {
        const searchRegex = new RegExp(searchName.trim(), 'i');
        query = {
          isActive: true,
          $or: [
            { 'taxData.personalInfo.firstName': searchRegex },
            { 'taxData.personalInfo.lastName': searchRegex },
          ],
        };
      }

      const employees = await Employee.find(query);

      if (employees.length === 0) {
        // No results found - list all available
        const allEmployees = await Employee.find({ isActive: true });
        const available = allEmployees.map(e => ({
          id: e._id.toString(),
          firstName: e.taxData.personalInfo.firstName,
          lastName: e.taxData.personalInfo.lastName,
          scenarioName: e.scenarioName,
        }));

        return {
          success: false,
          searchName,
          multipleResults: available,
          error: searchName
            ? `No employee found matching "${searchName}". Here are all available profiles:`
            : 'Here are all available profiles:',
        };
      }

      if (employees.length === 1) {
        // Exactly one match - return the data
        return {
          success: true,
          data: employees[0].taxData,
          searchName,
        };
      }

      // Multiple matches - return list for user to choose
      const results = employees.map(e => ({
        id: e._id.toString(),
        firstName: e.taxData.personalInfo.firstName,
        lastName: e.taxData.personalInfo.lastName,
        scenarioName: e.scenarioName,
      }));

      return {
        success: false,
        searchName,
        multipleResults: results,
        error: `Found ${employees.length} employees matching "${searchName}". Please ask the user which one they want:`,
      };
    } catch (error: any) {
      return {
        success: false,
        searchName,
        error: error.message || 'Failed to retrieve tax data',
      };
    }
  },
});
