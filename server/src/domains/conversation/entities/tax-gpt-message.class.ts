/**
 * Message Entity
 * Represents a single message in a conversation
 */
import { MessageId } from '@domains/conversation/value-objects/message-id.class';
import { ConversationId } from '@domains/conversation/value-objects/conversation-id.class';
import { MessageRole } from '@domains/conversation/value-objects/message-role.class';
import { FileId } from '@domains/document/value-objects/file-id.class';


export interface ToolCall {
  toolName: string;
  toolCallId: string;
  args: any;
  result?: any;
}

export class TaxGptMessage {
  constructor(
    public readonly id: MessageId,
    public readonly conversationId: ConversationId,
    public readonly role: MessageRole,
    private _content: string,
    private _displayContent?: string,
    private _fileIds: FileId[] = [],
    private _toolCalls: ToolCall[] = [],
    private _metadata: Record<string, any> = {},
    public readonly createdAt: Date = new Date()
  ) {
    this.validateContent(_content);
    // displayContent is now provided by the frontend (no auto-generation needed)
    // Frontend creates separate displayMessage and agentMessage at the source
  }

  // Getters
  get content(): string {
    return this._content;
  }

  get displayContent(): string {
    return this._displayContent || this._content;
  }

  get fileIds(): FileId[] {
    return [...this._fileIds]; // Return copy
  }

  get toolCalls(): ToolCall[] {
    return [...this._toolCalls]; // Return copy
  }

  get metadata(): Record<string, any> {
    return { ...this._metadata }; // Return copy
  }

  // Business methods

  /**
   * Update message content
   */
  updateContent(newContent: string): void {
    this.validateContent(newContent);
    this._content = newContent;
  }

  /**
   * Add file reference
   */
  addFile(fileId: FileId): void {
    if (this._fileIds.some(id => id.equals(fileId))) {
      return; // Already exists
    }
    this._fileIds.push(fileId);
  }

  /**
   * Remove file reference
   */
  removeFile(fileId: FileId): void {
    this._fileIds = this._fileIds.filter(id => !id.equals(fileId));
  }

  /**
   * Add tool call
   */
  addToolCall(toolCall: ToolCall): void {
    if (!toolCall.toolName || !toolCall.toolCallId) {
      throw new Error('Tool call must have name and ID');
    }
    this._toolCalls.push(toolCall);
  }

  /**
   * Update tool call result
   */
  updateToolCallResult(toolCallId: string, result: any): void {
    const toolCall = this._toolCalls.find(tc => tc.toolCallId === toolCallId);
    if (!toolCall) {
      throw new Error(`Tool call not found: ${toolCallId}`);
    }
    toolCall.result = result;
  }

  /**
   * Check if message has files
   */
  hasFiles(): boolean {
    return this._fileIds.length > 0;
  }

  /**
   * Check if message has tool calls
   */
  hasToolCalls(): boolean {
    return this._toolCalls.length > 0;
  }

  /**
   * Get file count
   */
  getFileCount(): number {
    return this._fileIds.length;
  }

  /**
   * Get tool call count
   */
  getToolCallCount(): number {
    return this._toolCalls.length;
  }

  /**
   * Set metadata value
   */
  setMetadataValue(key: string, value: any): void {
    this._metadata[key] = value;
  }

  /**
   * Get metadata value
   */
  getMetadataValue(key: string): any {
    return this._metadata[key];
  }

  // Private validation methods

  private validateContent(content: string): void {
    if (content === null || content === undefined) {
      throw new Error('Message content cannot be null or undefined');
    }
    // Allow empty strings for certain message types (e.g., tool calls)
    if (content.length > 50000) {
      throw new Error('Message content cannot exceed 50000 characters');
    }
  }
}
