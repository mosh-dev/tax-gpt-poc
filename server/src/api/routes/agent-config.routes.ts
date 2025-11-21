/**
 * Agent Config Routes
 * Routes for managing AI agent configuration
 */

import { Router, Request, Response } from 'express';
import { AgentConfig } from '../../models';
import { invalidateTaxAgent } from '../../agent';

const router = Router();

/**
 * GET /api/agent-config
 * Get the current agent configuration
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const config = await AgentConfig.findOne().lean();

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Agent configuration not found',
      });
    }

    res.json({
      success: true,
      config: {
        id: config._id,
        instructions: config.instructions,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('[AgentConfig] Failed to get config:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve agent configuration',
    });
  }
});

/**
 * PUT /api/agent-config
 * Update the agent configuration
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    const { instructions } = req.body;

    if (!instructions || typeof instructions !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Instructions are required and must be a string',
      });
    }

    // Find and update the config, or create if doesn't exist
    const config = await AgentConfig.findOneAndUpdate(
      {},
      { instructions },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    console.log('[AgentConfig] Configuration updated');

    // Invalidate the agent instance so it gets recreated with new instructions
    await invalidateTaxAgent();
    console.log('[AgentConfig] Agent instance invalidated - will use new instructions on next request');

    res.json({
      success: true,
      config: {
        id: config._id,
        instructions: config.instructions,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('[AgentConfig] Failed to update config:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update agent configuration',
    });
  }
});

export const agentConfigRoutes = router;
