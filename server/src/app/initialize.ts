/**
 * Application Initialization
 * Shared initialization logic for database, seeds, and LLM client
 * Can be safely called multiple times (idempotent)
 */

import { connectDatabase } from '@infrastructure/database/connection';
import { initializeLLMClient } from '@infrastructure/ai/llm-client';
import { runAllSeeds } from '@/scripts/seeds/run-seed';
import { registerApplicationComponents } from '@/app/di-container/container-registry';
import { injectFromContainer } from '@/app/di-container/container-helper';

import { ConversationController } from '@api/controllers/conversation.controller';
import { ChatController } from '@api/controllers/chat.controller';
import { FileController } from '@api/controllers/file.controller';

import { GetAllConversationsUseCase } from '@domains/conversation/use-cases/get-all-conversations.use-case';
import { GetConversationHistoryUseCase } from '@domains/conversation/use-cases/get-conversation-history.use-case';
import { DeleteConversationUseCase } from '@domains/conversation/use-cases/delete-conversation.use-case';
import { CreateConversationUseCase } from '@domains/conversation/use-cases/create-conversation.use-case';
import { StreamChatUseCase } from '@domains/conversation/use-cases/stream-chat.use-case';

import { UploadFileUseCase } from '@domains/document/use-cases/upload-file.use-case';
import { ProcessDocumentUseCase } from '@domains/document/use-cases/process-document.use-case';
import { GetFileUseCase } from '@domains/document/use-cases/get-file.use-case';
import { DeleteFileUseCase } from '@domains/document/use-cases/delete-file.use-case';

import { FileService } from '@domains/document/services/file.service';
import { AgentConfigService } from '@domains/agent-config/agent-config.service';
import { KnowledgeService } from '@domains/knowledge/services/knowledge.service';
import { RAGService } from '@domains/knowledge/services/rag.service';

import { OCRService } from '@infrastructure/ocr/ocr.service';
import { TesseractOCRService } from '@infrastructure/ocr/tesseract-ocr.service';
import { MastraAIAgentService } from '@infrastructure/ai/mastra-ai-agent.service';
import { VectorStoreService } from '@infrastructure/vector-store/vector-store.service';
import { LocalFileStorageService } from '@infrastructure/storage/local-file-storage.service';
import { LoggerService } from '@infrastructure/logger/logger.service';

import { MongoConversationRepository } from '@infrastructure/database/mongodb/repositories/mongo-conversation.repository';
import { MongoFileRepository } from '@infrastructure/database/mongodb/repositories/mongo-file.repository';
import { MongoMessageRepository } from '@infrastructure/database/mongodb/repositories/mongo-message.repository';

function testDIContainer(): void {
  const testCases: Array<{ name: string; class: any }> = [
    { name: 'ConversationController', class: ConversationController },
    { name: 'ChatController', class: ChatController },
    { name: 'FileController', class: FileController },
    { name: 'GetAllConversationsUseCase', class: GetAllConversationsUseCase },
    { name: 'GetConversationHistoryUseCase', class: GetConversationHistoryUseCase },
    { name: 'DeleteConversationUseCase', class: DeleteConversationUseCase },
    { name: 'CreateConversationUseCase', class: CreateConversationUseCase },
    { name: 'StreamChatUseCase', class: StreamChatUseCase },
    { name: 'UploadFileUseCase', class: UploadFileUseCase },
    { name: 'ProcessDocumentUseCase', class: ProcessDocumentUseCase },
    { name: 'GetFileUseCase', class: GetFileUseCase },
    { name: 'DeleteFileUseCase', class: DeleteFileUseCase },
    { name: 'FileService', class: FileService },
    { name: 'AgentConfigService', class: AgentConfigService },
    { name: 'KnowledgeService', class: KnowledgeService },
    { name: 'RAGService', class: RAGService },
    { name: 'OCRService', class: OCRService },
    { name: 'TesseractOCRService', class: TesseractOCRService },
    { name: 'MastraAIAgentService', class: MastraAIAgentService },
    { name: 'VectorStoreService', class: VectorStoreService },
    { name: 'LocalFileStorageService', class: LocalFileStorageService },
    { name: 'LoggerService', class: LoggerService },
    { name: 'MongoConversationRepository', class: MongoConversationRepository },
    { name: 'MongoFileRepository', class: MongoFileRepository },
    { name: 'MongoMessageRepository', class: MongoMessageRepository },
    { name: 'baseUrl', class: 'baseUrl' },
  ];

  let failureCount = 0;

  for (const test of testCases) {
    try {
      const instance = injectFromContainer(test.class as any);
      if (!instance) {
        console.error(`[DI Test] ❌ ${test.name}: resolved to null/undefined`);
        failureCount++;
      }
    } catch (error: any) {
      console.error(`[DI Test] ❌ ${test.name}: ${error.message}`);
      failureCount++;
    }
  }

  if (failureCount === 0) {
    console.log(`[DI Test] ✓ All ${testCases.length} dependency injections verified`);
  } else {
    throw new Error(`[DI Test] ${failureCount} of ${testCases.length} DI tests failed`);
  }
}

/**
 * Tracks if initialization has completed
 */
let isInitialized = false;

/**
 * Tracks if initialization is in progress
 */
let isInitializing = false;

/**
 * Initialize application dependencies
 * Idempotent - safe to call multiple times
 * @returns Promise<void>
 */
export async function initializeApp(): Promise<void> {
  // If already initialized, skip
  if (isInitialized) {
    console.log('[Initialize] Already initialized, skipping');
    return;
  }

  // If initialization in progress, wait for it
  if (isInitializing) {
    console.log('[Initialize] Initialization in progress, waiting...');
    await new Promise(resolve => setTimeout(resolve, 100));
    return initializeApp(); // Retry
  }

  isInitializing = true;
  console.log('[Initialize] Starting application initialization...');

  try {
    console.log('[Initialize] Starting initialization...');

    registerApplicationComponents();
    testDIContainer();

    await connectDatabase();

    await runAllSeeds();

    // Initialize LLM client
    await initializeLLMClient();

    isInitialized = true;
    console.log('[Initialize] Application initialization completed successfully');
  } catch (error) {
    console.error('[Initialize] Initialization failed:', error);
    throw error;
  } finally {
    isInitializing = false;
  }
}
