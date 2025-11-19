/**
 * Agent Setup
 * Singleton Tax Agent instance with async initialization
 */

import { TaxAgent } from './tax-agent';

/**
 * Singleton Tax Agent instance
 * Memory is initialized internally on first instantiation
 */
let taxAgentInstance: TaxAgent | null = null;

export function getTaxAgent(): TaxAgent {
    if (!taxAgentInstance) {
        throw new Error('TaxAgent not initialized. Call initializeTaxAgent() first.');
    }
    return taxAgentInstance;
}

export async function initializeTaxAgent(): Promise<TaxAgent> {
    taxAgentInstance = await TaxAgent.createWithDbInstructions();
    return taxAgentInstance;
}

// For backward compatibility - proxies to the initialized instance
export const taxAgent = new Proxy({} as TaxAgent, {
    get(target, prop) {
        return getTaxAgent()[prop as keyof TaxAgent];
    }
});
