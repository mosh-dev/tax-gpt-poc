import { Router, Request, Response } from 'express';
import { getMockTaxData, getAvailableScenarios } from '../services/mock-data';

const router = Router();

/**
 * GET /api/tax-data
 * Get mock tax data for a specific scenario
 */
router.get('/', (req: Request, res: Response) => {
  const scenario = req.query.scenario as 'single' | 'married' | 'freelancer' || 'single';

  try {
    const taxData = getMockTaxData(scenario);
    res.json({
      success: true,
      data: taxData,
      scenario,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get tax data',
    });
  }
});

/**
 * GET /api/tax-data/scenarios
 * Get list of available tax scenarios
 */
router.get('/scenarios', (req: Request, res: Response) => {
  try {
    const scenarios = getAvailableScenarios();
    res.json({
      success: true,
      scenarios,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get scenarios',
    });
  }
});

export default router;
