/**
 * FileId Value Object
 * Immutable identifier for files
 */

import { randomUUID } from 'crypto';

export class FileId {
  private readonly _value: string;

  private constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('FileId cannot be empty');
    }
    this._value = value;
  }

  get value(): string {
    return this._value;
  }

  /**
   * Create from existing ID
   */
  static create(id: string): FileId {
    return new FileId(id);
  }

  /**
   * Generate new unique ID
   */
  static generate(): FileId {
    return new FileId(randomUUID());
  }

  /**
   * Check equality
   */
  equals(other: FileId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
