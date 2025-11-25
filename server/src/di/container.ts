/**
 * Dependency Injection Container
 * Wires all dependencies together
 */
import { MongoConversationRepository } from '@infrastructure/database/mongodb/repositories/mongo-conversation-repository';
import { MongoMessageRepository } from '@infrastructure/database/mongodb/repositories/mongo-message-repository';
import { MongoFileRepository } from '@infrastructure/database/mongodb/repositories/mongo-file-repository';
import { LocalFileStorageService } from '@infrastructure/services/storage/local-file-storage-service';
import { IFileStorageService } from '@core/application/services/IFileStorageService';
import { IMessageRepository } from '@core/domain/repositories/IMessageRepository';
import { IConversationRepository } from '@core/domain/repositories/IConversationRepository';
import { IFileRepository } from '@core/domain/repositories/IFileRepository';
import { IAIAgentService } from '@core/application/services/IAIAgentService';
import { IOCRService } from '@core/application/services/IOCRService';
import { GetAllConversationsUseCase } from '@core/application/use-cases/conversation/GetAllConversationsUseCase';
import { GetConversationHistoryUseCase } from '@core/application/use-cases/conversation/GetConversationHistoryUseCase';
import { DeleteConversationUseCase } from '@core/application/use-cases/conversation/DeleteConversationUseCase';
import { CreateConversationUseCase } from '@core/application/use-cases/conversation/CreateConversationUseCase';
import { StreamChatUseCase } from '@core/application/use-cases/chat/StreamChatUseCase';
import { UploadFileUseCase } from '@core/application/use-cases/file/UploadFileUseCase';
import { ProcessDocumentUseCase } from '@core/application/use-cases/file/ProcessDocumentUseCase';
import { GetFileUseCase } from '@core/application/use-cases/file/GetFileUseCase';
import { DeleteFileUseCase } from '@core/application/use-cases/file/DeleteFileUseCase';
import { ConversationController } from '@api/controllers/conversation.controller';
import { ChatController } from '@api/controllers/chat.controller';
import { FileController } from '@api/controllers/file.controller';

/**
 * Container holds all instantiated dependencies
 */
export class Container {
  // Repositories
  public readonly conversationRepository: IConversationRepository;
  public readonly messageRepository: IMessageRepository;
  public readonly fileRepository: IFileRepository;

  // Infrastructure services
  public readonly fileStorageService: IFileStorageService;
  public aiAgentService?: IAIAgentService; // Optional, set later
  public ocrService?: IOCRService; // Optional, set later

  // Use cases
  public readonly getAllConversationsUseCase: GetAllConversationsUseCase;
  public readonly getConversationHistoryUseCase: GetConversationHistoryUseCase;
  public deleteConversationUseCase: DeleteConversationUseCase; // Not readonly - updated when AI agent is set
  public readonly createConversationUseCase: CreateConversationUseCase;
  public streamChatUseCase?: StreamChatUseCase; // Optional, requires AI agent
  public uploadFileUseCase?: UploadFileUseCase;
  public processDocumentUseCase?: ProcessDocumentUseCase; // Optional, requires OCR
  public readonly getFileUseCase: GetFileUseCase;
  public readonly deleteFileUseCase: DeleteFileUseCase;

  // Controllers
  public conversationController: ConversationController; // Not readonly - updated when AI agent is set
  public chatController?: ChatController; // Optional, requires stream chat use case
  public fileController?: FileController; // Optional, requires upload/process use cases

  constructor(baseUrl: string) {
    // 1. Initialize repositories
    this.conversationRepository = new MongoConversationRepository();
    this.messageRepository = new MongoMessageRepository();
    this.fileRepository = new MongoFileRepository();

    // 2. Initialize infrastructure services
    this.fileStorageService = new LocalFileStorageService(baseUrl);

    // 3. Initialize use cases (conversation)
    this.getAllConversationsUseCase = new GetAllConversationsUseCase(
      this.conversationRepository
    );

    this.getConversationHistoryUseCase = new GetConversationHistoryUseCase(
      this.conversationRepository,
      this.messageRepository
    );

    // Note: DeleteConversationUseCase needs AI Agent Service for Mastra cleanup
    // It will be wired when setAIAgentService() is called
    this.deleteConversationUseCase = new DeleteConversationUseCase(
      this.conversationRepository,
      this.messageRepository,
      undefined // AI Agent Service will be set later
    );

    this.createConversationUseCase = new CreateConversationUseCase(
      this.conversationRepository
    );

    // 4. Initialize use cases (file - basic ones)
    this.getFileUseCase = new GetFileUseCase(this.fileRepository);

    this.deleteFileUseCase = new DeleteFileUseCase(
      this.fileRepository,
      this.fileStorageService
    );

    // 5. Initialize controllers (basic ones)
    this.conversationController = new ConversationController(
      this.getAllConversationsUseCase,
      this.getConversationHistoryUseCase,
      this.deleteConversationUseCase
    );
  }

  /**
   * Set AI agent service and wire chat dependencies
   */
  setAIAgentService(aiAgentService: IAIAgentService): void {
    this.aiAgentService = aiAgentService;

    // Re-wire DeleteConversationUseCase with AI Agent Service for Mastra cleanup
    this.deleteConversationUseCase = new DeleteConversationUseCase(
      this.conversationRepository,
      this.messageRepository,
      aiAgentService
    );

    // Re-wire ConversationController with updated use case
    this.conversationController = new ConversationController(
      this.getAllConversationsUseCase,
      this.getConversationHistoryUseCase,
      this.deleteConversationUseCase
    );

    // Wire stream chat use case
    this.streamChatUseCase = new StreamChatUseCase(
      this.conversationRepository,
      this.messageRepository,
      aiAgentService
    );

    // Wire chat controller
    this.chatController = new ChatController(this.streamChatUseCase);
  }

  /**
   * Set OCR service and wire file processing dependencies
   */
  setOCRService(ocrService: IOCRService): void {
    this.ocrService = ocrService;

    // Wire process document use case
    this.processDocumentUseCase = new ProcessDocumentUseCase(
      this.fileRepository,
      ocrService
    );

    // Wire upload file use case
    this.uploadFileUseCase = new UploadFileUseCase(
      this.fileRepository,
      this.fileStorageService
    );

    // Wire file controller (if not already wired)
    if (!this.fileController) {
      this.fileController = new FileController(
        this.uploadFileUseCase,
        this.processDocumentUseCase,
        this.getFileUseCase,
        this.deleteFileUseCase
      );
    }
  }
}

// Export singleton container
export let container: Container;

/**
 * Initialize container
 */
export function initializeContainer(baseUrl: string): Container {
  container = new Container(baseUrl);
  return container;
}
