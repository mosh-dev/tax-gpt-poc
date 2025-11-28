import { connectDatabase } from '@infrastructure/database/connection';
import { initializeLLMClient } from '@infrastructure/ai/llm-client';
import { runAllSeeds } from '@/scripts/seeds/run-seed';
import { registerApplicationComponents } from '@/app/di-container/container-registry';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { LoggerService } from '@infrastructure/logger/logger.service';

let isInitialized = false;
let isInitializing = false;

/**
 * Initialize application dependencies
 * Idempotent - safe to call multiple times
 * @returns Promise<void>
 */
export async function initializeApp(): Promise<void> {
  if (isInitialized) {
    console.log('[Initialize] Already initialized, skipping');
    return;
  }

  if (isInitializing) {
    console.log('[Initialize] Initialization in progress, waiting...');
    await new Promise(resolve => setTimeout(resolve, 100));
    return initializeApp(); // Retry
  }

  isInitializing = true;
  try {
    registerApplicationComponents();
    await connectDatabase();
    await runAllSeeds();
    await initializeLLMClient();

    const logger = injectFromContainer(LoggerService);

    isInitialized = true;
    logger.log('[Initialize] Application initialization completed successfully');
  } catch (error) {
    console.error('[Initialize] Initialization failed:', error);
    throw error;
  } finally {
    isInitializing = false;
  }
}
