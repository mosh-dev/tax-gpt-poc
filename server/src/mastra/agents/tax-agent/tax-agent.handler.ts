/**
 * Agent Setup
 * Singleton pattern with flag-based invalidation for efficiency
 */

import { TaxAgent } from './tax-agent';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { LoggerService } from '@infrastructure/logger/logger.service';

/**
 * Singleton agent instance
 * Recreated when agent config is updated
 */
let taxAgentInstance: TaxAgent | null = null;

/**
 * Flag to indicate if instructions need to be refreshed from DB
 * Set to true when invalidateTaxAgent() is called
 */
let needsRefresh: boolean = true;

/**
 * Flag to track ongoing agent creation
 * Prevents multiple simultaneous instantiations
 */
let isCreating: boolean = false;

/**
 * Get or create the singleton TaxAgent instance
 * Only queries DB if needsRefresh flag is set (after invalidation)
 * Thread-safe: prevents multiple simultaneous agent creations
 * @returns Promise<TaxAgent> - Singleton agent instance
 */
export async function getOrCreateTaxAgent(): Promise<TaxAgent> {
  const logger = injectFromContainer(LoggerService);
  // If agent is currently being created, wait briefly and retry
  if (isCreating) {
    logger.log('[TaxAgent] Agent creation in progress, waiting...');
    await new Promise(resolve => setTimeout(resolve, 10));
    return getOrCreateTaxAgent(); // Retry
  }

  // If agent exists and doesn't need refresh, return immediately (no DB query)
  if (taxAgentInstance && !needsRefresh) {
    return taxAgentInstance;
  }

  // Agent needs to be created or refreshed - query DB for latest instructions
  logger.log(
    { reason: !taxAgentInstance ? 'no instance' : 'refresh requested' },
    '[TaxAgent] Fetching instructions from database'
  );

  isCreating = true;
  try {
    const instructions = await TaxAgent.getInstructionsFromDb();
    const agent = new TaxAgent(instructions);

    taxAgentInstance = agent;
    needsRefresh = false; // Clear refresh flag

    logger.log('[TaxAgent] Agent instance created successfully');

    return agent;
  } catch (error) {
    logger.error(error as any,'[TaxAgent] Error creating agent instance:');
    throw error;
  } finally {
    isCreating = false;
  }
}

/**
 * Invalidate the agent instance
 * Call this when agent config is updated in the database
 * Sets the needsRefresh flag so next request will fetch fresh instructions
 */
export async function invalidateTaxAgent(): Promise<void> {
  injectFromContainer(LoggerService).log('[TaxAgent] Invalidating agent - next request will fetch fresh instructions from DB');
  taxAgentInstance = null;
  needsRefresh = true;
}
