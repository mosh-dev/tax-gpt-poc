/**
 * Agent Config Seed Script
 * Seeds the database with default AI agent system instructions
 */

import {AgentConfig, IAgentConfig} from '../models';

const defaultInstructions = ``;

/**
 * Seed agent config to database
 * Always deletes existing config and creates fresh one
 */
export async function seedAgentConfig(): Promise<void> {
    if (!defaultInstructions) {
        console.log('[Seed] No instructions to seed...');
    }
    console.log('[Seed] Seeding agent config...');

    try {

        const existingAgentConfig = await AgentConfig.findOne().lean<IAgentConfig>();
        if (existingAgentConfig) {
            return;
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