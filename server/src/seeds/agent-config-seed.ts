/**
 * Agent Config Seed Script
 * Seeds the database with default AI agent system instructions
 */


import * as fs from 'fs';
import * as path from 'path';
import { env } from '@config/env';
import { AgentConfig, IAgentConfig } from '@models/agent-config.model';
import { getPathInfo } from '@config/path-utils';

// Load default system instructions from assets folder
// This makes it easier to edit and maintain the instructions
// Works in both dev (src/assets) and production (dist/assets)
const { __dirname } = getPathInfo(import.meta.url);
const instructionsPath = path.join(__dirname, '../assets/system-instructions.md');
const defaultInstructions = fs.readFileSync(instructionsPath, 'utf-8');

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

        // Create default config
        const config = new AgentConfig({
            instructions: defaultInstructions,
        });

        await config.save();
        console.log('[Seed] Agent config created with default instructions');
        console.log(`[Seed] Instructions loaded from: ${instructionsPath}`);
    } catch (error) {
        console.error('[Seed] Error seeding agent config:', error);
        throw error;
    }
}

/**
 * Get current agent config
 */
export async function getAgentConfig() {
    return AgentConfig.findOne();
}

export {defaultInstructions};
