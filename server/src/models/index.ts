/**
 * Models Index
 * Export all database models
 */

export interface ObjectMap<T = any> {
  [key: string]: T;
}

export { Conversation } from './conversation.model';
export { Message } from './message.model';
export { File  } from './file.model';
export { User } from './user.model';
export { AgentConfig } from './agent-config.model';
export { Employee } from './employee.model';
export { Secret } from './secret.model';
