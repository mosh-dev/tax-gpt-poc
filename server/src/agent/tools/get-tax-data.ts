import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Employee } from '../../models';

/**
 * Tool to retrieve Swiss tax data by searching employee name
 * Fetches employee tax information from the database
 */
export const getTaxDataTool = createTool({
  id: 'get-tax-data',
  description: `Retrieves Swiss tax data by searching for an employee by name.

USE THIS WHEN:
- User asks to "load my data", "show my tax info", "retrieve my details"
- User wants to see their current tax situation or tax data
- User mentions their name and wants to work with their existing tax information

CRITICAL RULES:
- Never assume names. Always ask "What is your name?" unless the user already provided it (first name, last name, or full name)
- Never use placeholders like "John Doe" or guess names
- If user provides any part of their name, use that without asking again

HOW IT WORKS:
1. First call with searchName parameter (searches both first and last name fields)
2. If exactly one match found → Returns tax data immediately
3. If multiple matches found → Returns list of options with id, firstName, lastName, scenarioName
4. Then call again with specific employeeId from user's selection
5. If no matches found → Returns list of all available profiles

PARAMETERS:
- searchName (optional): Name to search for. Searches both first and last name using case-insensitive regex. Leave empty to list all available profiles.
- employeeId (optional): Specific employee ID when user has selected from multiple results. Use this for the second call after user chooses from options.

OUTPUT SCENARIOS:
- success=true, data: Single match found, returns complete taxData object
- success=false, multipleResults: Multiple matches, returns array of options for user to choose
- success=false, multipleResults: No matches, returns all available profiles
- success=false, error: Database error or invalid employeeId`,
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
