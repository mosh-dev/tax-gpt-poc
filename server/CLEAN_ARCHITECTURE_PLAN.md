# Clean Architecture Refactoring Plan

## Overview
Restructure the Tax-GPT server following Clean Architecture principles to improve:
- **Testability**: Isolated business logic, easy to test without external dependencies
- **Maintainability**: Clear separation of concerns
- **Flexibility**: Easy to swap implementations (e.g., MongoDB → PostgreSQL)
- **Scalability**: Well-organized codebase that grows predictably

## Clean Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                  Presentation Layer                      │
│         (Controllers, Routes, Middleware, DTOs)          │
├─────────────────────────────────────────────────────────┤
│                  Application Layer                       │
│         (Use Cases, Application Services, DTOs)          │
├─────────────────────────────────────────────────────────┤
│                    Domain Layer                          │
│     (Entities, Repository Interfaces, Domain Logic)      │
├─────────────────────────────────────────────────────────┤
│                 Infrastructure Layer                     │
│  (DB Implementations, External Services, File System)    │
└─────────────────────────────────────────────────────────┘
```

**Dependency Rule**: Dependencies point INWARD
- Presentation depends on Application
- Application depends on Domain
- Infrastructure depends on Domain (implements interfaces)
- Domain depends on NOTHING (pure business logic)

---

## New Directory Structure

```
server/src/
├── core/                           # Inner layers (business logic)
│   ├── domain/                     # Domain Layer (no external deps)
│   │   ├── entities/
│   │   │   ├── Conversation.ts         # Domain entity
│   │   │   ├── Message.ts              # Domain entity
│   │   │   ├── File.ts                 # Domain entity
│   │   │   └── TaxData.ts              # Domain entity (for tax info)
│   │   ├── value-objects/
│   │   │   ├── ConversationId.ts       # Value object
│   │   │   ├── MessageRole.ts          # Enum/value object
│   │   │   └── FileMetadata.ts         # Value object
│   │   ├── repositories/               # Repository interfaces (contracts)
│   │   │   ├── IConversationRepository.ts
│   │   │   ├── IMessageRepository.ts
│   │   │   └── IFileRepository.ts
│   │   ├── services/                   # Domain services (pure logic)
│   │   │   └── TaxCalculationService.ts
│   │   └── index.ts
│   │
│   └── application/                # Application Layer
│       ├── use-cases/
│       │   ├── chat/
│       │   │   ├── StreamChatUseCase.ts
│       │   │   ├── GetConversationHistoryUseCase.ts
│       │   │   └── DeleteConversationUseCase.ts
│       │   ├── conversation/
│       │   │   ├── CreateConversationUseCase.ts
│       │   │   ├── GetAllConversationsUseCase.ts
│       │   │   └── UpdateConversationUseCase.ts
│       │   ├── file/
│       │   │   ├── UploadFileUseCase.ts
│       │   │   ├── ProcessDocumentUseCase.ts
│       │   │   ├── GetFileUseCase.ts
│       │   │   └── DeleteFileUseCase.ts
│       │   └── tax/
│       │       ├── GenerateTaxPDFUseCase.ts
│       │       └── CalculateDeductionsUseCase.ts
│       ├── dtos/
│       │   ├── ChatRequestDTO.ts
│       │   ├── ConversationDTO.ts
│       │   ├── MessageDTO.ts
│       │   └── FileUploadDTO.ts
│       ├── services/                   # Application service interfaces
│       │   ├── IOCRService.ts
│       │   ├── IPDFGeneratorService.ts
│       │   ├── IFileStorageService.ts
│       │   └── IAIAgentService.ts
│       └── index.ts
│
├── infrastructure/                 # Infrastructure Layer
│   ├── database/
│   │   ├── mongodb/
│   │   │   ├── models/
│   │   │   │   ├── ConversationModel.ts    # Mongoose schema
│   │   │   │   ├── MessageModel.ts
│   │   │   │   └── FileModel.ts
│   │   │   ├── repositories/               # Repository implementations
│   │   │   │   ├── MongoConversationRepository.ts
│   │   │   │   ├── MongoMessageRepository.ts
│   │   │   │   └── MongoFileRepository.ts
│   │   │   ├── mappers/                    # DB ↔ Domain mapping
│   │   │   │   ├── ConversationMapper.ts
│   │   │   │   ├── MessageMapper.ts
│   │   │   │   └── FileMapper.ts
│   │   │   └── connection.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── ocr/                            # OCR service implementation
│   │   │   ├── TesseractOCRService.ts
│   │   │   ├── processors/
│   │   │   ├── config.ts
│   │   │   └── index.ts
│   │   ├── ai/
│   │   │   ├── MastraAIAgentService.ts
│   │   │   ├── tools/
│   │   │   │   ├── GenerateTaxPDFTool.ts
│   │   │   │   ├── ProcessDocumentsTool.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── pdf/
│   │   │   └── PDFGeneratorService.ts
│   │   ├── storage/
│   │   │   └── LocalFileStorageService.ts
│   │   └── index.ts
│   ├── config/
│   │   ├── storage.config.ts
│   │   ├── lmstudio.config.ts
│   │   └── index.ts
│   └── index.ts
│
├── presentation/                   # Presentation Layer
│   ├── http/
│   │   ├── controllers/
│   │   │   ├── ChatController.ts
│   │   │   ├── ConversationController.ts
│   │   │   └── FileController.ts
│   │   ├── routes/
│   │   │   ├── chat.routes.ts
│   │   │   ├── conversation.routes.ts
│   │   │   ├── file.routes.ts
│   │   │   └── index.ts
│   │   ├── middleware/
│   │   │   ├── error.middleware.ts
│   │   │   ├── logging.middleware.ts
│   │   │   └── validation.middleware.ts
│   │   ├── dtos/
│   │   │   ├── requests/
│   │   │   │   ├── ChatRequest.ts
│   │   │   │   └── FileUploadRequest.ts
│   │   │   └── responses/
│   │   │       ├── ChatResponse.ts
│   │   │       └── ConversationResponse.ts
│   │   └── mappers/
│   │       ├── ChatMapper.ts
│   │       └── ConversationMapper.ts
│   └── index.ts
│
├── shared/                         # Shared utilities
│   ├── types/
│   │   ├── Result.ts               # Result pattern for error handling
│   │   └── index.ts
│   ├── errors/
│   │   ├── AppError.ts
│   │   ├── DomainError.ts
│   │   └── InfrastructureError.ts
│   └── utils/
│       └── logger.ts
│
├── di/                             # Dependency Injection
│   ├── container.ts                # DI container setup
│   └── types.ts                    # DI symbols/types
│
└── index.ts                        # Application entry point

```

---

## Layer Responsibilities

### 1. Domain Layer (`core/domain`)

**Purpose**: Core business logic, completely independent of frameworks

**Contents**:
- **Entities**: Business objects (Conversation, Message, File, TaxData)
- **Value Objects**: Immutable values (ConversationId, MessageRole)
- **Repository Interfaces**: Contracts for data access (no implementation)
- **Domain Services**: Pure business logic (tax calculations, validations)

**Rules**:
- ✅ No external dependencies (no Express, MongoDB, etc.)
- ✅ Pure TypeScript/JavaScript
- ✅ Business rules and validations
- ❌ No database code
- ❌ No HTTP code
- ❌ No external service calls

**Example Entity**:
```typescript
// core/domain/entities/Conversation.ts
export class Conversation {
  constructor(
    public readonly id: ConversationId,
    public title: string,
    public taxYear?: number,
    public metadata: Record<string, any> = {},
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  updateTitle(newTitle: string): void {
    if (!newTitle || newTitle.trim().length === 0) {
      throw new Error('Title cannot be empty');
    }
    this.title = newTitle;
    this.updatedAt = new Date();
  }

  isActive(): boolean {
    return this.taxYear === new Date().getFullYear();
  }
}
```

**Example Repository Interface**:
```typescript
// core/domain/repositories/IConversationRepository.ts
export interface IConversationRepository {
  create(conversation: Conversation): Promise<Conversation>;
  findById(id: ConversationId): Promise<Conversation | null>;
  findAll(userId?: string, limit?: number): Promise<Conversation[]>;
  update(conversation: Conversation): Promise<void>;
  delete(id: ConversationId): Promise<void>;
}
```

---

### 2. Application Layer (`core/application`)

**Purpose**: Application-specific business rules, orchestrate domain logic

**Contents**:
- **Use Cases**: Single-purpose application actions (StreamChatUseCase, UploadFileUseCase)
- **DTOs**: Data Transfer Objects for use case input/output
- **Service Interfaces**: Contracts for external services (OCR, PDF, AI)

**Rules**:
- ✅ Depends on Domain Layer only
- ✅ Orchestrates domain entities and services
- ✅ Defines service interfaces (implemented in Infrastructure)
- ❌ No direct database/HTTP/framework code
- ❌ No implementation details

**Example Use Case**:
```typescript
// core/application/use-cases/chat/StreamChatUseCase.ts
export class StreamChatUseCase {
  constructor(
    private conversationRepo: IConversationRepository,
    private messageRepo: IMessageRepository,
    private aiAgent: IAIAgentService
  ) {}

  async execute(request: StreamChatRequestDTO): Promise<AsyncIterable<StreamEvent>> {
    // 1. Get or create conversation
    let conversation = await this.conversationRepo.findById(
      new ConversationId(request.conversationId)
    );

    if (!conversation) {
      conversation = new Conversation(
        ConversationId.generate(),
        'New Tax Conversation'
      );
      await this.conversationRepo.create(conversation);
    }

    // 2. Save user message
    const userMessage = new Message(
      MessageId.generate(),
      conversation.id,
      MessageRole.User,
      request.message
    );
    await this.messageRepo.create(userMessage);

    // 3. Get conversation history
    const history = await this.messageRepo.findByConversationId(conversation.id);

    // 4. Stream AI response
    return this.aiAgent.streamChat(request.message, history);
  }
}
```

**Example Service Interface**:
```typescript
// core/application/services/IOCRService.ts
export interface IOCRService {
  processDocument(filePath: string, options: OCROptions): Promise<OCRResult>;
  processMultiple(filePaths: string[], options: OCROptions): Promise<OCRResult[]>;
}
```

---

### 3. Infrastructure Layer (`infrastructure`)

**Purpose**: Implement technical capabilities (database, external services)

**Contents**:
- **Repository Implementations**: MongoDB implementations of domain repository interfaces
- **External Services**: OCR, PDF generation, AI agent, file storage
- **Database Models**: Mongoose schemas (separate from domain entities)
- **Mappers**: Convert between domain entities and database models
- **Configuration**: Database connection, storage paths, LMStudio config

**Rules**:
- ✅ Implements domain repository interfaces
- ✅ Implements application service interfaces
- ✅ Contains all external dependencies (MongoDB, Tesseract, etc.)
- ✅ Maps between database models and domain entities
- ❌ No business logic

**Example Repository Implementation**:
```typescript
// infrastructure/database/mongodb/repositories/MongoConversationRepository.ts
export class MongoConversationRepository implements IConversationRepository {
  constructor(private model: typeof ConversationModel) {}

  async create(conversation: Conversation): Promise<Conversation> {
    const dbModel = ConversationMapper.toPersistence(conversation);
    const doc = await this.model.create(dbModel);
    return ConversationMapper.toDomain(doc);
  }

  async findById(id: ConversationId): Promise<Conversation | null> {
    const doc = await this.model.findOne({ conversationId: id.value }).lean();
    return doc ? ConversationMapper.toDomain(doc) : null;
  }

  // ... other methods
}
```

**Example Service Implementation**:
```typescript
// infrastructure/services/ocr/TesseractOCRService.ts
export class TesseractOCRService implements IOCRService {
  async processDocument(filePath: string, options: OCROptions): Promise<OCRResult> {
    // Tesseract implementation details
    const worker = await createWorker(options.language);
    const result = await worker.recognize(filePath);
    await worker.terminate();

    return {
      text: result.data.text,
      confidence: result.data.confidence,
      // ...
    };
  }

  async processMultiple(filePaths: string[], options: OCROptions): Promise<OCRResult[]> {
    return Promise.all(filePaths.map(path => this.processDocument(path, options)));
  }
}
```

---

### 4. Presentation Layer (`presentation`)

**Purpose**: Handle HTTP requests/responses, route to use cases

**Contents**:
- **Controllers**: Handle HTTP logic, call use cases
- **Routes**: Express route definitions
- **Middleware**: Error handling, logging, validation
- **Request/Response DTOs**: HTTP-specific data structures
- **Mappers**: Convert between HTTP DTOs and application DTOs

**Rules**:
- ✅ Depends on Application Layer
- ✅ Handles HTTP concerns (request/response)
- ✅ Delegates business logic to use cases
- ✅ Returns proper HTTP status codes
- ❌ No business logic
- ❌ No direct database access

**Example Controller**:
```typescript
// presentation/http/controllers/ChatController.ts
export class ChatController {
  constructor(private streamChatUseCase: StreamChatUseCase) {}

  async streamChat(req: Request, res: Response): Promise<void> {
    try {
      // 1. Validate and map request
      const requestDTO = ChatMapper.toApplicationDTO(req.body);

      // 2. Execute use case
      const stream = await this.streamChatUseCase.execute(requestDTO);

      // 3. Setup SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // 4. Stream events
      for await (const event of stream) {
        if (!res.writable) break;
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      res.end();
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private handleError(error: any, res: Response): void {
    if (error instanceof DomainError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof InfrastructureError) {
      res.status(503).json({ error: 'Service unavailable' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
```

---

## Dependency Injection

Use a simple DI container to wire dependencies:

```typescript
// di/container.ts
import { Container } from 'inversify';
import { TYPES } from './types';

const container = new Container();

// Repositories
container.bind<IConversationRepository>(TYPES.ConversationRepository)
  .to(MongoConversationRepository).inSingletonScope();
container.bind<IMessageRepository>(TYPES.MessageRepository)
  .to(MongoMessageRepository).inSingletonScope();
container.bind<IFileRepository>(TYPES.FileRepository)
  .to(MongoFileRepository).inSingletonScope();

// Services
container.bind<IOCRService>(TYPES.OCRService)
  .to(TesseractOCRService).inSingletonScope();
container.bind<IPDFGeneratorService>(TYPES.PDFGeneratorService)
  .to(PDFGeneratorService).inSingletonScope();
container.bind<IAIAgentService>(TYPES.AIAgentService)
  .to(MastraAIAgentService).inSingletonScope();

// Use Cases
container.bind<StreamChatUseCase>(TYPES.StreamChatUseCase)
  .to(StreamChatUseCase);
container.bind<UploadFileUseCase>(TYPES.UploadFileUseCase)
  .to(UploadFileUseCase);

// Controllers
container.bind<ChatController>(TYPES.ChatController)
  .to(ChatController);
container.bind<FileController>(TYPES.FileController)
  .to(FileController);

export { container };
```

---

## Migration Strategy

### Phase 1: Create New Structure (Parallel)
1. Create new directory structure alongside existing code
2. Implement domain entities and repository interfaces
3. No disruption to existing functionality

### Phase 2: Implement Application Layer
1. Create use cases that encapsulate current logic
2. Define service interfaces

### Phase 3: Move Infrastructure
1. Move MongoDB repositories to new structure
2. Move OCR, PDF, AI services to infrastructure layer
3. Implement repository and service interfaces

### Phase 4: Refactor Presentation
1. Create controllers that use new use cases
2. Update routes to use controllers
3. Move middleware to presentation layer

### Phase 5: Wire Dependencies
1. Setup DI container
2. Update index.ts to use container
3. Remove old code

### Phase 6: Cleanup
1. Delete old structure
2. Update imports
3. Test thoroughly

---

## Benefits

1. **Testability**: Use cases can be tested without database or HTTP
2. **Flexibility**: Easy to swap MongoDB for PostgreSQL (just implement interfaces)
3. **Maintainability**: Clear separation of concerns, easy to locate code
4. **Scalability**: Add new features without touching existing code
5. **Domain-Centric**: Business logic is isolated and protected
6. **Framework Independence**: Core logic doesn't depend on Express or Mongoose

---

## Example: Complete Flow

**Request Flow**:
```
HTTP Request → Route → Controller → Use Case → Repository Interface
                                        ↓
                                   Domain Entity
                                        ↓
                                   Repository Implementation → MongoDB
```

**Example: Create Conversation**:
1. HTTP POST → `POST /api/conversations`
2. Route → `conversation.routes.ts`
3. Controller → `ConversationController.create()`
4. Use Case → `CreateConversationUseCase.execute()`
5. Domain → `new Conversation(...)` (entity creation with validation)
6. Repository Interface → `IConversationRepository.create()`
7. Repository Implementation → `MongoConversationRepository.create()`
8. Mapper → `ConversationMapper.toPersistence()` (entity → DB model)
9. MongoDB → Save document
10. Mapper → `ConversationMapper.toDomain()` (DB model → entity)
11. Use Case → Return entity
12. Controller → Map to response DTO
13. HTTP Response → JSON

---

## Notes

- **Start Small**: Refactor one feature at a time (e.g., conversations first)
- **Keep Tests**: Write tests for use cases as you migrate
- **Backwards Compatibility**: Keep old routes working during migration
- **Document**: Update CLAUDE.md as you go
- **Incremental**: Merge small, working changes frequently

This architecture will make the codebase much more maintainable and testable!
