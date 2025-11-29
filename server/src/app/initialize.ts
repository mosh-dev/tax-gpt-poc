import { connectDatabase } from '@infrastructure/database/connection';
import { initializeLLMClient } from '@infrastructure/ai/llm-client';
import { runAllSeeds } from '@/scripts/seeds/run-seed';
import { registerApplicationComponents } from '@/app/di-container/container-registry';
import { pinoServerLogger } from '@utils/pino-logger';
import { STORAGE_PATHS, STORAGE_ROOT } from '@config/storage';
import fs from 'fs';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { LoggerService } from '@infrastructure/logger/logger.service';

let isInitialized = false;
let isInitializing = false;


/**
 * Ensure all storage directories exist
 * Creates them if they don't exist
 */
function ensureStorageDirectories(): void {
  const logger = injectFromContainer(LoggerService);
  logger.log('[Storage] Ensuring storage directories...');
  logger.log(`[Storage] STORAGE_ROOT: ${STORAGE_ROOT}`);

  // Create root storage directory
  if (!fs.existsSync(STORAGE_ROOT)) {
    logger.log(`[Storage] Creating root storage directory: ${STORAGE_ROOT}`);
    fs.mkdirSync(STORAGE_ROOT, { recursive: true });
  } else {
    logger.log('[Storage] Root storage directory already exists');
  }

  // Create subdirectories (except vectors.db which is a file)
  const directories = ['files', 'temp', 'tesseract', 'logs'] as const;

  for (const dir of directories) {
    const dirPath = STORAGE_PATHS[dir];
    if (!fs.existsSync(dirPath)) {
      logger.log(`[Storage] Creating subdirectory: ${dir} at ${dirPath}`);
      fs.mkdirSync(dirPath, { recursive: true });
    } else {
      logger.log(`[Storage] Subdirectory already exists: ${dir}`);
    }
  }

  logger.log('[Storage] Storage directories setup complete');
}


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
    ensureStorageDirectories();
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
