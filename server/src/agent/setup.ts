/**
 * Agent Setup
 * Singleton Tax Agent instance
 */

import { TaxAgent } from './tax-agent';

/**
 * Singleton Tax Agent instance
 * Memory is initialized internally on first instantiation
 */
export const taxAgent = new TaxAgent();
