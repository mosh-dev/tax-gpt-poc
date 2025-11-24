/**
 * Seeds Index
 * Export all seed functions
 */


import { seedAgentConfig } from '@/seeds/agent-config-seed';
import { seedEmployees } from '@/seeds/employee-seed';

/**
 * Run all seed scripts
 */
export async function runAllSeeds(): Promise<void> {

  await seedAgentConfig();
  await seedEmployees();

  console.log('[Seed] All seed scripts completed');
}
