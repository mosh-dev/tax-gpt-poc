import { Environment } from '@config/environment';
import { AgentConfig, IAgentConfig } from '@domains/agent-config/models/agent-config.model';
import { DEFAULT_SYSTEM_INSTRUCTIONS } from '@/mastra/agents/tax-agent/system-instructions';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { LoggerService } from '@infrastructure/logger/logger.service';

/**
 * Seed agent config to database
 * Always deletes existing config and creates fresh one
 */
export async function seedAgentConfig(): Promise<void> {
  const logger = injectFromContainer(LoggerService);
  logger.info('[Seed] Seeding agent config...');

  try {
    const existingAgentConfig = await AgentConfig.findOne().lean<IAgentConfig>();
    if (existingAgentConfig) {
      if (!Environment.FORCE_SEED_SYSTEM_INSTRUCTION) {
        return;
      }
    }

    // Delete existing config first
    const deleteResult = await AgentConfig.deleteMany({});
    if (deleteResult.deletedCount > 0) {
      logger.info(`[Seed] Deleted ${deleteResult.deletedCount} existing agent config(s)`);
    }

    // Create default config with imported instructions
    const config = new AgentConfig({
      instructions: DEFAULT_SYSTEM_INSTRUCTIONS,
    });

    await config.save();
    logger.info('[Seed] Agent config created with default instructions');
  } catch (error) {
    logger.error(error, '[Seed] Error seeding agent config:');
    throw error;
  }
}
