/**
 * Agent Config Routes
 * Routes for managing AI agent configuration
 */

import { Router, Request, Response } from 'express';
import { getErrorMessage } from '@utils/error-handler';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { AgentConfigService } from '@domains/agent-config/agent-config.service';

const router = Router();

/**
 * GET /api/agent-config
 * Get the current agent configuration
 */
router.get('/', async (_: Request, res: Response) => {
  const agentConfigService = injectFromContainer(AgentConfigService);
  try {
    const config = await agentConfigService.getConfig();

    if (!config) {
      res.status(404).json({
        success: false,
        error: 'Agent configuration not found',
      });
    }

    res.json({
      success: true,
      config,
    });
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    console.error('[AgentConfigRoutes] Failed to get config:', errorMsg);
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

/**
 * PUT /api/agent-config
 * Update the agent configuration
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    const agentConfigService = injectFromContainer(AgentConfigService);

    const { instructions } = req.body;
    const config = await agentConfigService.updateConfig({ instructions });

    res.json({
      success: true,
      config,
    });
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    console.error('[AgentConfigRoutes] Failed to update config:', errorMsg);

    // Handle validation errors with 400 status
    if (errorMsg.includes('required') || errorMsg.includes('cannot be empty')) {
      res.status(400).json({
        success: false,
        error: errorMsg,
      });
    }

    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

export const agentConfigRoutes = router;
