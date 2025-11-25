/**
 * MessageRole Value Object
 * Represents the role of a message sender
 */

export enum MessageRoleEnum {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export class MessageRole {
  private readonly _value: MessageRoleEnum;

  private constructor(value: MessageRoleEnum) {
    this._value = value;
  }

  get value(): MessageRoleEnum {
    return this._value;
  }

  static User(): MessageRole {
    return new MessageRole(MessageRoleEnum.USER);
  }

  static Assistant(): MessageRole {
    return new MessageRole(MessageRoleEnum.ASSISTANT);
  }

  static System(): MessageRole {
    return new MessageRole(MessageRoleEnum.SYSTEM);
  }

  static fromString(value: string): MessageRole {
    switch (value.toLowerCase()) {
      case 'user':
        return MessageRole.User();
      case 'assistant':
        return MessageRole.Assistant();
      case 'system':
        return MessageRole.System();
      default:
        throw new Error(`Invalid message role: ${value}`);
    }
  }

  equals(other: MessageRole): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  isUser(): boolean {
    return this._value === MessageRoleEnum.USER;
  }

  isAssistant(): boolean {
    return this._value === MessageRoleEnum.ASSISTANT;
  }

  isSystem(): boolean {
    return this._value === MessageRoleEnum.SYSTEM;
  }
}
