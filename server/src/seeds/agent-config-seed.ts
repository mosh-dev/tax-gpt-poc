/**
 * Agent Config Seed Script
 * Seeds the database with default AI agent system instructions
 */

import { env } from '@infrastructure/llm/env';
import { AgentConfig, IAgentConfig } from '@/mastra/agents/agent-config.model';
import { DEFAULT_SYSTEM_INSTRUCTIONS } from '@/mastra/agents/tax-agent/system-instructions';

/**
 * Seed agent config to database
 * Always deletes existing config and creates fresh one
 */
export async function seedAgentConfig(): Promise<void> {
    console.log('[Seed] Seeding agent config...');

    try {
        const existingAgentConfig = await AgentConfig.findOne().lean<IAgentConfig>();
        if (existingAgentConfig) {
          if (!env.FORCE_SEED_SYSTEM_INSTRUCTION) {
            return;
          }
        }

        // Delete existing config first
        const deleteResult = await AgentConfig.deleteMany({});
        if (deleteResult.deletedCount > 0) {
            console.log(`[Seed] Deleted ${deleteResult.deletedCount} existing agent config(s)`);
        }

        // Create default config with imported instructions
        const config = new AgentConfig({
            instructions: DEFAULT_SYSTEM_INSTRUCTIONS,
        });

        await config.save();
        console.log('[Seed] Agent config created with default instructions');
    } catch (error) {
        console.error('[Seed] Error seeding agent config:', error);
        throw error;
    }
}
