/**
 * Conversation Entity
 * Represents a tax conversation between user and AI assistant
 */
import { ConversationId } from '@domains/conversation/value-objects/conversation-id.class';

export interface ConversationMetadata {
  location?: string;
  permitType?: string;
  maritalStatus?: string;
  employmentType?: string;
  [key: string]: any;
}

export class TaxGptConversation {
  constructor(
    public readonly id: ConversationId,
    private _title: string,
    private _taxYear?: number,
    private _userId?: string,
    private _metadata: ConversationMetadata = {},
    public readonly createdAt: Date = new Date(),
    private _updatedAt: Date = new Date()
  ) {
    this.validateTitle(_title);
    if (_taxYear !== undefined) {
      this.validateTaxYear(_taxYear);
    }
  }

  // Getters
  get title(): string {
    return this._title;
  }

  get taxYear(): number | undefined {
    return this._taxYear;
  }

  get userId(): string | undefined {
    return this._userId;
  }

  get metadata(): ConversationMetadata {
    return { ...this._metadata }; // Return copy to maintain immutability
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Business methods

  /**
   * Update conversation title
   */
  updateTitle(newTitle: string): void {
    this.validateTitle(newTitle);
    this._title = newTitle;
    this._updatedAt = new Date();
  }

  /**
   * Set tax year
   */
  setTaxYear(year: number): void {
    this.validateTaxYear(year);
    this._taxYear = year;
    this._updatedAt = new Date();
  }

  /**
   * Update metadata
   */
  updateMetadata(newMetadata: Partial<ConversationMetadata>): void {
    this._metadata = {
      ...this._metadata,
      ...newMetadata,
    };
    this._updatedAt = new Date();
  }

  /**
   * Set metadata value
   */
  setMetadataValue(key: string, value: any): void {
    this._metadata[key] = value;
    this._updatedAt = new Date();
  }

  /**
   * Get metadata value
   */
  getMetadataValue(key: string): any {
    return this._metadata[key];
  }

  /**
   * Check if conversation is for current tax year
   */
  isCurrentYear(): boolean {
    const currentYear = new Date().getFullYear();
    return this._taxYear === currentYear;
  }

  /**
   * Check if conversation is active (has recent activity)
   */
  isActive(daysThreshold: number = 30): boolean {
    const daysSinceUpdate = (Date.now() - this._updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate <= daysThreshold;
  }

  /**
   * Assign to user
   */
  assignToUser(userId: string): void {
    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID cannot be empty');
    }
    this._userId = userId;
    this._updatedAt = new Date();
  }

  // Private validation methods

  private validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error('Conversation title cannot be empty');
    }
    if (title.length > 200) {
      throw new Error('Conversation title cannot exceed 200 characters');
    }
  }

  private validateTaxYear(year: number): void {
    const currentYear = new Date().getFullYear();
    const minYear = 1900;
    const maxYear = currentYear + 1; // Allow next year for planning

    if (year < minYear || year > maxYear) {
      throw new Error(`Tax year must be between ${minYear} and ${maxYear}`);
    }
  }
}
