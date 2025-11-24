/**
 * Agent Config Seed Script
 * Seeds the database with default AI agent system instructions
 */


import * as fs from 'fs';
import * as path from 'path';
import { env } from '@config/env';
import { AgentConfig, IAgentConfig } from '@models/agent-config.model';
import { getPathInfo } from '@config/path-utils';

/**
 * Load default system instructions from assets folder
 * This makes it easier to edit and maintain the instructions
 * Works in both dev (src/assets) and production (dist/assets)
 * Returns null if file doesn't exist (e.g., in Mastra playground)
 */
function loadDefaultInstructions(): string | null {
  try {
    const { __dirname: seedDir } = getPathInfo(import.meta.url);
    const instructionsPath = path.join(seedDir, '../assets/system-instructions.md');

    // Check if file exists before reading
    if (!fs.existsSync(instructionsPath)) {
      console.log(`[Seed] System instructions file not found at: ${instructionsPath}`);
      console.log(`[Seed] This is expected in Mastra playground environment`);
      return null;
    }

    return fs.readFileSync(instructionsPath, 'utf-8');
  } catch (error) {
    console.warn('[Seed] Could not load default instructions:', error);
    return null;
  }
}

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

        // Load instructions at runtime (not at module import time)
        const defaultInstructions = loadDefaultInstructions();

        // Skip seeding if instructions file is not available (e.g., Mastra playground)
        if (!defaultInstructions) {
            console.log('[Seed] Skipping agent config seed - instructions file not available');
            return;
        }

        // Create default config
        const config = new AgentConfig({
            instructions: defaultInstructions,
        });

        await config.save();
        console.log('[Seed] Agent config created with default instructions');
    } catch (error) {
        console.error('[Seed] Error seeding agent config:', error);
        throw error;
    }
}
