import { registerToContainer } from '@/app/di-container/container-helper';

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
import { MastraLoggerService } from '@infrastructure/ai/mastra-logger.service';
import { VectorStoreService } from '@infrastructure/vector-store/vector-store.service';
import { LocalFileStorageService } from '@infrastructure/storage/local-file-storage.service';
import { LoggerService } from '@infrastructure/logger/logger.service';

import {
  MongoConversationRepository
} from '@infrastructure/database/mongodb/repositories/mongo-conversation.repository';
import { MongoFileRepository } from '@infrastructure/database/mongodb/repositories/mongo-file.repository';
import { MongoMessageRepository } from '@infrastructure/database/mongodb/repositories/mongo-message.repository';

import { Environment } from '@config/environment';

export function registerApplicationComponents() {
  registerToContainer(ConversationController);
  registerToContainer(ChatController);
  registerToContainer(FileController);

  registerToContainer(GetAllConversationsUseCase);
  registerToContainer(GetConversationHistoryUseCase);
  registerToContainer(DeleteConversationUseCase);
  registerToContainer(CreateConversationUseCase);
  registerToContainer(StreamChatUseCase);
  registerToContainer(UploadFileUseCase);
  registerToContainer(ProcessDocumentUseCase);
  registerToContainer(GetFileUseCase);
  registerToContainer(DeleteFileUseCase);

  registerToContainer(FileService);
  registerToContainer(AgentConfigService);
  registerToContainer(KnowledgeService);
  registerToContainer(RAGService);
  registerToContainer(OCRService);
  registerToContainer(TesseractOCRService);
  registerToContainer(MastraAIAgentService);
  registerToContainer(VectorStoreService);
  registerToContainer(LocalFileStorageService);
  registerToContainer(LoggerService);
  registerToContainer(MastraLoggerService);

  registerToContainer(MongoConversationRepository);
  registerToContainer(MongoFileRepository);
  registerToContainer(MongoMessageRepository);

  registerToContainer('baseUrl', Environment.BASE_URL);
}
