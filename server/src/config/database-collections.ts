/**
 * Database Collection Names
 * Central source for all MongoDB collection names
 */

// Mastra Collections (managed by Mastra framework)
export const MASTRA_COLLECTIONS = {
  THREADS: 'mastra_threads',
  MESSAGES: 'mastra_messages',
  WORKFLOW_SNAPSHOT: 'mastra_workflow_snapshot',
  TRACES: 'mastra_traces',
  RESOURCES: 'mastra_resources',
  SCORERS: 'mastra_scorers',
  AI_SPANS: 'mastra_ai_spans',
} as const;

// Application Collections (our custom collections)
export const APP_COLLECTIONS = {
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  FILES: 'files',
  USERS: 'users',
  EMPLOYEES: 'employees',
  AGENT_CONFIG: 'agent_config',
  KNOWLEDGE_BASE: 'knowledge_base',
  SECRETS: 'secrets',
} as const;

// All collections
export const DB_COLLECTIONS = {
  ...MASTRA_COLLECTIONS,
  ...APP_COLLECTIONS,
} as const;
