/**
 * MessageId Value Object
 * Immutable identifier for messages
 */

import { randomUUID } from 'crypto';

export class MessageId {
  private readonly _value: string;

  private constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('MessageId cannot be empty');
    }
    this._value = value;
  }

  get value(): string {
    return this._value;
  }

  /**
   * Create from existing ID
   */
  static create(id: string): MessageId {
    return new MessageId(id);
  }

  /**
   * Generate new unique ID
   */
  static generate(): MessageId {
    return new MessageId(randomUUID());
  }

  /**
   * Check equality
   */
  equals(other: MessageId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
