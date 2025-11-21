/**
 * Employee Routes
 * API endpoints for retrieving employee/tax data
 */

import { Router, Request, Response } from 'express';
import { Employee } from '../../models';

const router = Router();

/**
 * GET /api/employees
 * Get all active employees with their tax data
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const employees = await Employee.find({ isActive: true })
      .sort({ scenarioId: 1 })
      .select('-__v');

    res.json({
      success: true,
      count: employees.length,
      employees: employees.map(emp => ({
        id: emp._id,
        scenarioId: emp.scenarioId,
        scenarioName: emp.scenarioName,
        scenarioDescription: emp.scenarioDescription,
        taxData: emp.taxData,
        createdAt: emp.createdAt,
        updatedAt: emp.updatedAt,
      })),
    });
  } catch (error) {
    console.error('[Employees] Error fetching employees:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch employees',
    });
  }
});

/**
 * GET /api/employees/scenarios
 * Get list of available scenarios (summary view)
 */
router.get('/scenarios', async (req: Request, res: Response) => {
  try {
    const employees = await Employee.find({ isActive: true })
      .sort({ scenarioId: 1 })
      .select('scenarioId scenarioName scenarioDescription taxData.personalInfo.firstName taxData.personalInfo.lastName taxData.income taxData.taxYear');

    const scenarios = employees.map(emp => {
      // Calculate total income
      const income = emp.taxData.income;
      const totalIncome = (income.employment || 0) +
        (income.selfEmployment || 0) +
        (income.investments || 0) +
        (income.rental || 0) +
        (income.other || 0);

      return {
        scenarioId: emp.scenarioId,
        scenarioName: emp.scenarioName,
        scenarioDescription: emp.scenarioDescription,
        personName: `${emp.taxData.personalInfo.firstName} ${emp.taxData.personalInfo.lastName}`,
        totalIncome,
        taxYear: emp.taxData.taxYear,
      };
    });

    res.json({
      success: true,
      count: scenarios.length,
      scenarios,
    });
  } catch (error) {
    console.error('[Employees] Error fetching scenarios:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch scenarios',
    });
  }
});

/**
 * GET /api/employees/:scenarioId
 * Get specific employee by scenario ID
 */
router.get('/:scenarioId', async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.params;

    const employee = await Employee.findOne({
      scenarioId,
      isActive: true,
    }).select('-__v');

    if (!employee) {
      res.status(404).json({
        error: 'Not Found',
        message: `Employee scenario '${scenarioId}' not found`,
      });
      return;
    }

    res.json({
      success: true,
      employee: {
        id: employee._id,
        scenarioId: employee.scenarioId,
        scenarioName: employee.scenarioName,
        scenarioDescription: employee.scenarioDescription,
        taxData: employee.taxData,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Employees] Error fetching employee:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch employee',
    });
  }
});

export const employeeRoutes = router;
