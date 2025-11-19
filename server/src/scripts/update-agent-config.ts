/**
 * Script to update agent config in database
 * Run with: ts-node src/scripts/update-agent-config.ts
 */

import { connectDatabase } from '../config/database';
import { AgentConfig } from '../models';
import { defaultInstructions } from '../seeds';

async function updateAgentConfig() {
  console.log('[Update] Connecting to database...');
  await connectDatabase();

  console.log('[Update] Updating agent config with latest instructions...');

  const result = await AgentConfig.findOneAndUpdate(
    {},
    { instructions: defaultInstructions },
    { upsert: true, new: true }
  );

  if (result) {
    console.log('[Update] Agent config updated successfully');
    console.log(`[Update] Instructions length: ${defaultInstructions.length} characters`);
  } else {
    console.error('[Update] Failed to update agent config');
    process.exit(1);
  }

  process.exit(0);
}

updateAgentConfig().catch((error) => {
  console.error('[Update] Error:', error);
  process.exit(1);
});
