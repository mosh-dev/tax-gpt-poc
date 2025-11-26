/**
 * Agent Config Service
 * Business logic for agent configuration management
 */

import { AgentConfig, IAgentConfig } from '@domains/agent-config/models/agent-config.model';
import { invalidateTaxAgent } from '@/mastra/agents/tax-agent/tax-agent.handler';

export interface UpdateConfigParams {
  instructions: string;
}

export interface AgentConfigResponse {
  id: string;
  instructions: string;
  updatedAt: Date;
}

export class AgentConfigService {
  /**
   * Get the current agent configuration
   */
  async getConfig(): Promise<AgentConfigResponse | null> {
    const config = await AgentConfig.findOne().lean<IAgentConfig>();

    if (!config) {
      return null;
    }

    return {
      id: config._id.toString(),
      instructions: config.instructions,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Update agent configuration
   */
  async updateConfig(params: UpdateConfigParams): Promise<AgentConfigResponse> {
    const { instructions } = params;

    // Validation
    if (!instructions || typeof instructions !== 'string') {
      throw new Error('Instructions are required and must be a string');
    }

    if (instructions.trim().length === 0) {
      throw new Error('Instructions cannot be empty');
    }

    // Find and update the config, or create if doesn't exist
    const config = await AgentConfig.findOneAndUpdate(
      {},
      { instructions },
      { new: true, upsert: true, runValidators: true }
    ).lean<IAgentConfig>();

    console.log('[AgentConfigService] Configuration updated');

    // Invalidate the agent instance so it gets recreated with new instructions
    await invalidateTaxAgent();
    console.log('[AgentConfigService] Agent instance invalidated');

    return {
      id: config._id.toString(),
      instructions: config.instructions,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Check if configuration exists
   */
  async configExists(): Promise<boolean> {
    const count = await AgentConfig.countDocuments();
    return count > 0;
  }
}

// Export singleton instance
export const agentConfigService = new AgentConfigService();
