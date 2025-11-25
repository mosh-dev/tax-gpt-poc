/**
 * Message Builder Utilities
 * Handles file uploads and message construction with attachments
 */

import { apiService } from '../../services/api';
import { FILE_ATTACHMENT_FORMAT } from '../../constants/chatMessages';

export interface PreparedMessage {
  userDisplayMessage: string;
  agentMessage: string;
  fileIds: string[];
}

/**
 * Prepares a message with file uploads and attachments
 * Handles file upload, message formatting for both user display and agent processing
 */
export const prepareMessageWithFiles = async (
  message: string,
  files: File[],
  threadId?: string
): Promise<PreparedMessage> => {
  let fileIds: string[] = [];
  const hasFiles = files.length > 0;

  // Upload files if provided
  if (hasFiles) {
    const uploadedFiles = await apiService.uploadFiles(files, threadId);
    fileIds = uploadedFiles.map(f => f.fileId);
  }

  // Build messages with file attachments
  const userDisplayMessage = hasFiles
    ? `${message}${FILE_ATTACHMENT_FORMAT.USER_DISPLAY(files.map(f => f.name).join(', '))}`
    : message;

  const agentMessage = fileIds.length > 0
    ? `${message}${FILE_ATTACHMENT_FORMAT.AGENT_MARKERS(fileIds)}`
    : message;

  return {
    userDisplayMessage,
    agentMessage,
    fileIds,
  };
};
