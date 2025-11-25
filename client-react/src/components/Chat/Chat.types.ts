/**
 * Type definitions for Chat component
 */

export interface LocationState {
  initialMessage?: string;
  files?: File[]; // Raw File objects from Welcome (not uploaded yet)
}

export interface ChatProps {
  threadId: string;
}

export interface SwissTaxData {
  name?: string;
  maritalStatus?: string;
  income?: number;
  deductions?: number;

  [key: string]: any;
}

export interface SendMessageOptions {
  replaceMessages?: boolean;  // true for initial, false for regular
  onConnected?: (receivedThreadId?: string) => void;
}

export interface TaxDataToolResult {
  success?: boolean;
  data?: SwissTaxData;
  scenario?: string;
  [key: string]: any;
}

export interface StreamChatParams {
  content: string;
  threadId: string;
  fileIds?: string[];
  onConnected?: (threadId?: string) => void;
  agentMessage?: string;
}