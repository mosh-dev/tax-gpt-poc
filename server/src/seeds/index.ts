/**
 * Seeds Index
 * Export all seed functions
 */

export { seedEmployees, getSeededEmployees, getEmployeeByScenarioId, employeeSeedData } from './employee-seed';
export { seedAgentConfig, getAgentConfig, defaultInstructions } from './agent-config-seed';

/**
 * Run all seed scripts
 */
export async function runAllSeeds(): Promise<void> {
  const { seedEmployees } = await import('./employee-seed');
  const { seedAgentConfig } = await import('./agent-config-seed');

  await seedAgentConfig();
  await seedEmployees();

  console.log('[Seed] All seed scripts completed');
}
