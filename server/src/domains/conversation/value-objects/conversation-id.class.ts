/**
 * ConversationId Value Object
 * Immutable identifier for conversations
 */

import { randomUUID } from 'crypto';

export class ConversationId {
  private readonly _value: string;

  private constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('ConversationId cannot be empty');
    }
    this._value = value;
  }

  get value(): string {
    return this._value;
  }

  /**
   * Create from existing ID
   */
  static create(id: string): ConversationId {
    return new ConversationId(id);
  }

  /**
   * Generate new unique ID
   */
  static generate(): ConversationId {
    return new ConversationId(randomUUID());
  }

  /**
   * Check equality
   */
  equals(other: ConversationId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
