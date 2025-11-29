import { connectDatabase } from '@infrastructure/database/connection';
import { initializeLLMClient } from '@infrastructure/ai/llm-client';
import { runAllSeeds } from '@/scripts/seeds/run-seed';
import { registerApplicationComponents } from '@/app/di-container/container-registry';
import { pinoServerLogger } from '@utils/pino-logger';

let isInitialized = false;
let isInitializing = false;

/**
 * Initialize application dependencies
 * Idempotent - safe to call multiple times
 * @returns Promise<void>
 */
export async function initializeApp(): Promise<void> {
  if (isInitialized) {
    pinoServerLogger.info('[Initialize] Already initialized, skipping');
    return;
  }

  if (isInitializing) {
    pinoServerLogger.info('[Initialize] Initialization in progress, waiting...');
    await new Promise(resolve => setTimeout(resolve, 100));
    return initializeApp(); // Retry
  }

  isInitializing = true;
  try {
    registerApplicationComponents();
    await connectDatabase();
    await runAllSeeds();
    await initializeLLMClient();

    isInitialized = true;
    pinoServerLogger.info('[Initialize] Application initialization completed successfully');
  } catch (error) {
    pinoServerLogger.error(error as any, '[Initialize] Initialization failed:');
    throw error;
  } finally {
    isInitializing = false;
  }
}
