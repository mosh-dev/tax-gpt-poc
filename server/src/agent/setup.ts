/**
 * Agent Setup
 * Singleton pattern with manual invalidation on config updates
 */

import { TaxAgent } from './tax-agent';

/**
 * Singleton agent instance
 * Recreated when agent config is updated
 */
let taxAgentInstance: TaxAgent | null = null;
let currentInstructions: string | null = null;

/**
 * Promise to track ongoing agent creation
 * Prevents multiple simultaneous instantiations
 */
let creationPromise: Promise<TaxAgent> | null = null;

/**
 * Get or create the singleton TaxAgent instance
 * Checks if instructions have changed and recreates agent if needed
 * Thread-safe: prevents multiple simultaneous agent creations
 * @returns Promise<TaxAgent> - Singleton agent instance
 */
export async function getOrCreateTaxAgent(): Promise<TaxAgent> {
    // If agent is currently being created, wait for that to complete
    if (creationPromise) {
        console.log('[TaxAgent] Waiting for ongoing agent creation');
        return await creationPromise;
    }

    // Fetch current instructions from database
    const instructions = await TaxAgent.getInstructionsFromDb();

    // If no instance exists, or instructions have changed, create new agent
    if (!taxAgentInstance || currentInstructions !== instructions) {
        console.log('[TaxAgent] Creating new agent instance with fresh instructions');

        // Start creation and store promise to prevent concurrent creation
        creationPromise = (async () => {
            try {
                const agent = new TaxAgent(instructions);
                taxAgentInstance = agent;
                currentInstructions = instructions;
                return agent;
            } finally {
                // Clear the creation promise when done
                creationPromise = null;
            }
        })();

        return await creationPromise;
    } else {
        console.log('[TaxAgent] Using existing agent instance');
        return taxAgentInstance;
    }
}

/**
 * Invalidate and recreate the agent instance
 * Call this when agent config is updated in the database
 */
export async function invalidateTaxAgent(): Promise<void> {
    console.log('[TaxAgent] Invalidating agent instance - will recreate on next request');
    taxAgentInstance = null;
    currentInstructions = null;
}

/**
 * Initialize tax agent at startup
 * Creates the singleton instance with instructions from DB
 */
export async function initializeTaxAgent(): Promise<void> {
    await getOrCreateTaxAgent();
    console.log('[TaxAgent] Agent initialized successfully');
}

/**
 * Legacy singleton access - DEPRECATED
 * Use getOrCreateTaxAgent() instead for proper async handling
 * This proxy is kept for backward compatibility with existing code
 */
export const taxAgent = new Proxy({} as TaxAgent, {
    get(target, prop) {
        throw new Error(
            'Direct access to taxAgent singleton is deprecated. ' +
            'Use getOrCreateTaxAgent() to get the agent instance.'
        );
    }
});
