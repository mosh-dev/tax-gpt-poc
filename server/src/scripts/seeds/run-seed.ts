/**
 * Seeds Index
 * Export all seed functions
 */

import { seedAgentConfig } from '@/scripts/seeds/agent-config-seed';
import { seedEmployees } from '@/scripts/seeds/employee-seed';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { LoggerService } from '@infrastructure/logger/logger.service';

/**
 * Run all seed scripts
 * Note: Individual seed functions are idempotent (they check database state)
 */
export async function runAllSeeds(): Promise<void> {
  await seedAgentConfig();
  await seedEmployees();

  injectFromContainer(LoggerService).info('[Seed] All seed scripts completed');
}
