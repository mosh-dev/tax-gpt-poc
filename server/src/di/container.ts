/**
 * Dependency Injection Container
 * Wires all dependencies together
 */

// Domain repositories (interfaces)
import type { IConversationRepository, IMessageRepository, IFileRepository } from '../core/domain/repositories';

// Infrastructure implementations
import {
  MongoConversationRepository,
  MongoMessageRepository,
  MongoFileRepository,
} from '../infrastructure/database/mongodb';
import { LocalFileStorageService } from '../infrastructure/services/storage';

// Application use cases
import {
  GetAllConversationsUseCase,
  GetConversationHistoryUseCase,
  DeleteConversationUseCase,
  CreateConversationUseCase,
  StreamChatUseCase,
  UploadFileUseCase,
  ProcessDocumentUseCase,
  GetFileUseCase,
  DeleteFileUseCase,
} from '../core/application/use-cases';

// Application services (interfaces)
import type {
  IFileStorageService,
  IAIAgentService,
  IOCRService,
} from '../core/application/services';

// Presentation controllers
import {
  ConversationController,
  ChatController,
  FileController,
} from '../presentation/http/controllers';

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
  public readonly deleteConversationUseCase: DeleteConversationUseCase;
  public readonly createConversationUseCase: CreateConversationUseCase;
  public streamChatUseCase?: StreamChatUseCase; // Optional, requires AI agent
  public uploadFileUseCase?: UploadFileUseCase;
  public processDocumentUseCase?: ProcessDocumentUseCase; // Optional, requires OCR
  public readonly getFileUseCase: GetFileUseCase;
  public readonly deleteFileUseCase: DeleteFileUseCase;

  // Controllers
  public readonly conversationController: ConversationController;
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

    this.deleteConversationUseCase = new DeleteConversationUseCase(
      this.conversationRepository,
      this.messageRepository
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
