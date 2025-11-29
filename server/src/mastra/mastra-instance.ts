/**
 * Mastra Instance Getter/Setter
 * Provides access to the Mastra instance without circular dependencies
 */
import type { Mastra } from '@mastra/core';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { LoggerService } from '@infrastructure/logger/logger.service';

let mastraInstance: Mastra | null = null;

/**
 * Set the Mastra instance
 * Called once during initialization in index.ts
 */
export function setMastra(instance: Mastra): void {
  mastraInstance = instance;
  injectFromContainer(LoggerService).info('[Mastra Instance] Mastra instance registered');
}

/**
 * Get the Mastra instance
 * Throws if called before initialization
 */
export function getMastra(): Mastra {
  if (!mastraInstance) {
    throw new Error('Mastra instance not initialized.');
  }
  return mastraInstance;
}
