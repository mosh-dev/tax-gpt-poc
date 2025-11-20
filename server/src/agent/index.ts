/**
 * Agent Module
 * Exports the Swiss Tax Assistant agent and related types
 */

export { TaxAgent } from './tax-agent';
export { taxAgent, initializeTaxAgent, getOrCreateTaxAgent, invalidateTaxAgent } from './setup';
export * from './tools';
