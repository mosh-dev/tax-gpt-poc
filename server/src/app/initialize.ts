/**
 * Application Initialization
 * Shared initialization logic for database, seeds, and LLM client
 * Can be safely called multiple times (idempotent)
 */

import { connectDatabase } from '@infrastructure/database/connection';
import { initializeLLMClient } from '@infrastructure/ai/llm-client';
import { runAllSeeds } from '@/scripts/seeds/run-seed';
import { container } from 'tsyringe';
import { TOKENS } from '@/app/container.tokens';
import { Environment } from '@config/environment';

/**
 * Tracks if initialization has completed
 */
let isInitialized = false;

/**
 * Tracks if initialization is in progress
 */
let isInitializing = false;

/**
 * Initialize application dependencies
 * Idempotent - safe to call multiple times
 * @returns Promise<void>
 */
export async function initializeApp(): Promise<void> {
  // If already initialized, skip
  if (isInitialized) {
    console.log('[Initialize] Already initialized, skipping');
    return;
  }

  // If initialization in progress, wait for it
  if (isInitializing) {
    console.log('[Initialize] Initialization in progress, waiting...');
    await new Promise(resolve => setTimeout(resolve, 100));
    return initializeApp(); // Retry
  }

  isInitializing = true;
  console.log('[Initialize] Starting application initialization...');

  try {
    console.log('[Express Setup] DI Container initialized');

    container.register(TOKENS.BASE_URL, { useValue: Environment.BASE_URL });

    // Connect to database
    await connectDatabase();

    // Run seeds
    await runAllSeeds();

    // Initialize LLM client
    await initializeLLMClient();

    isInitialized = true;
    console.log('[Initialize] Application initialization completed successfully');
  } catch (error) {
    console.error('[Initialize] Initialization failed:', error);
    throw error;
  } finally {
    isInitializing = false;
  }
}
