# Clean Architecture Implementation

## Overview

The server has been refactored to follow Clean Architecture principles. Both the old and new implementations exist side-by-side for a smooth transition.

## Architecture Layers

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

## Directory Structure

```
server/src/
├── core/                           # Inner layers (business logic)
│   ├── domain/                     # Domain Layer
│   │   ├── entities/               # Business entities
│   │   ├── value-objects/          # Immutable values
│   │   └── repositories/           # Repository interfaces
│   └── application/                # Application Layer
│       ├── use-cases/              # Use case implementations
│       ├── dtos/                   # Data Transfer Objects
│       └── services/               # Service interfaces
│
├── infrastructure/                 # Infrastructure Layer
│   ├── database/mongodb/
│   │   ├── repositories/           # MongoDB implementations
│   │   └── mappers/                # Domain ↔ DB mapping
│   └── services/                   # Service implementations
│       ├── storage/                # File storage
│       ├── ai/                     # AI agent adapter
│       ├── ocr/                    # OCR adapter
│       └── pdf/                    # PDF generator adapter
│
├── presentation/                   # Presentation Layer
│   └── http/
│       ├── controllers/            # HTTP controllers
│       └── routes/                 # Route definitions
│
├── di/                             # Dependency Injection
│   └── container.ts                # DI container
│
├── index.ts                        # OLD entry point
└── index-clean.ts                  # NEW entry point (Clean Architecture)
```

## Switching to Clean Architecture

### Option 1: Use New Entry Point Directly

Update `package.json` to use the new entry point:

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn src/index-clean.ts"
  }
}
```

### Option 2: Rename Files (Permanent Switch)

```bash
# Backup old implementation
mv src/index.ts src/index-old.ts

# Use new implementation
mv src/index-clean.ts src/index.ts

# Run as normal
npm run dev
```

## Key Components

### Domain Layer

**Entities** (`core/domain/entities/`)
- `Conversation` - Tax conversation with metadata
- `Message` - Chat message with tool calls
- `File` - Uploaded file with OCR processing

**Value Objects** (`core/domain/value-objects/`)
- `ConversationId` - Unique conversation identifier
- `MessageId` - Unique message identifier
- `FileId` - Unique file identifier
- `MessageRole` - User/Assistant/System role
- `FileMetadata` - Immutable file metadata

**Repository Interfaces** (`core/domain/repositories/`)
- `IConversationRepository` - Conversation data access contract
- `IMessageRepository` - Message data access contract
- `IFileRepository` - File data access contract

### Application Layer

**Use Cases** (`core/application/use-cases/`)
- `StreamChatUseCase` - Handle streaming chat with AI
- `GetAllConversationsUseCase` - Retrieve all conversations
- `GetConversationHistoryUseCase` - Get conversation with messages
- `DeleteConversationUseCase` - Delete conversation
- `UploadFileUseCase` - Upload and store files
- `ProcessDocumentUseCase` - OCR processing
- `GetFileUseCase` - Get file metadata
- `DeleteFileUseCase` - Delete file

**Service Interfaces** (`core/application/services/`)
- `IAIAgentService` - AI agent contract
- `IOCRService` - OCR processing contract
- `IPDFGeneratorService` - PDF generation contract
- `IFileStorageService` - File storage contract

### Infrastructure Layer

**Repository Implementations** (`infrastructure/database/mongodb/repositories/`)
- `MongoConversationRepository` - MongoDB implementation
- `MongoMessageRepository` - MongoDB implementation
- `MongoFileRepository` - MongoDB implementation

**Service Implementations** (`infrastructure/services/`)
- `MastraAIAgentService` - Wraps existing TaxAgent
- `TesseractOCRService` - Wraps existing OCRService
- `PDFGeneratorService` - Wraps existing PDF generator
- `LocalFileStorageService` - Local file system storage

**Mappers** (`infrastructure/database/mongodb/mappers/`)
- `ConversationMapper` - Map domain ↔ database
- `MessageMapper` - Map domain ↔ database
- `FileMapper` - Map domain ↔ database

### Presentation Layer

**Controllers** (`presentation/http/controllers/`)
- `ConversationController` - Handle conversation HTTP requests
- `ChatController` - Handle chat SSE streaming
- `FileController` - Handle file upload/processing

**Routes** (`presentation/http/routes/`)
- `conversation.routes.ts` - Conversation endpoints
- `chat.routes.ts` - Chat streaming endpoint
- `file.routes.ts` - File upload/process endpoints

## Dependency Injection

The DI container (`di/container.ts`) wires all dependencies:

```typescript
// Initialize container
const container = initializeContainer(baseUrl);

// Wire services
container.setAIAgentService(new MastraAIAgentService());
container.setOCRService(new TesseractOCRService());

// Controllers are automatically wired
const conversationController = container.conversationController;
const chatController = container.chatController;
const fileController = container.fileController;
```

## Benefits

### 1. Testability
- Use cases can be tested without database or HTTP
- Mock repositories and services easily
- Test business logic in isolation

```typescript
// Example test
const mockRepo = createMockConversationRepository();
const useCase = new GetAllConversationsUseCase(mockRepo);
const result = await useCase.execute();
```

### 2. Maintainability
- Clear separation of concerns
- Easy to locate code
- Each layer has single responsibility

### 3. Flexibility
- Swap implementations easily (MongoDB → PostgreSQL)
- No vendor lock-in
- Framework independence

```typescript
// Easy to swap MongoDB for PostgreSQL
container.conversationRepository = new PostgresConversationRepository();
```

### 4. Domain-Centric
- Business logic is protected and isolated
- Database details don't leak into business logic
- Pure domain entities with validation

## Adding New Features

### Example: Add User Authentication

**1. Domain Layer** - Create User entity

```typescript
// core/domain/entities/User.ts
export class User {
  constructor(
    public readonly id: UserId,
    private _email: string,
    private _name: string
  ) {
    this.validateEmail(_email);
  }

  // Business methods and validation
}
```

**2. Domain Layer** - Create repository interface

```typescript
// core/domain/repositories/IUserRepository.ts
export interface IUserRepository {
  create(user: User): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
}
```

**3. Application Layer** - Create use case

```typescript
// core/application/use-cases/user/RegisterUserUseCase.ts
export class RegisterUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(dto: RegisterUserDTO): Promise<UserDTO> {
    const user = new User(UserId.generate(), dto.email, dto.name);
    const saved = await this.userRepository.create(user);
    return UserMapper.toDTO(saved);
  }
}
```

**4. Infrastructure Layer** - Implement repository

```typescript
// infrastructure/database/mongodb/repositories/MongoUserRepository.ts
export class MongoUserRepository implements IUserRepository {
  async create(user: User): Promise<User> {
    const data = UserMapper.toPersistence(user);
    const doc = await UserModel.create(data);
    return UserMapper.toDomain(doc.toObject());
  }
}
```

**5. Presentation Layer** - Create controller

```typescript
// presentation/http/controllers/UserController.ts
export class UserController {
  constructor(private registerUserUseCase: RegisterUserUseCase) {}

  async register(req: Request, res: Response): Promise<void> {
    const result = await this.registerUserUseCase.execute(req.body);
    res.json({ success: true, user: result });
  }
}
```

**6. Wire in DI Container**

```typescript
// di/container.ts
this.userRepository = new MongoUserRepository();
this.registerUserUseCase = new RegisterUserUseCase(this.userRepository);
this.userController = new UserController(this.registerUserUseCase);
```

## Migration Notes

### Existing Code Location

Old implementation files remain in:
- `services/` - Old services (tax-agent, mongodb-memory, etc.)
- `models/` - Mongoose models (still used by new implementation)
- `routes/` - Old route handlers
- `config/` - Configuration files (shared with new implementation)
- `tools/` - Mastra tools (used by AI agent adapter)

### Gradual Migration

You can migrate features incrementally:
1. Start with conversation management
2. Add chat streaming
3. Add file upload/processing
4. Add additional features

The old implementation continues to work during migration.

## Testing

Each layer can be tested independently:

```typescript
// Test domain entity
test('Conversation validates title', () => {
  expect(() => new Conversation(id, '')).toThrow();
});

// Test use case with mock repository
test('GetAllConversationsUseCase returns conversations', async () => {
  const mockRepo = { findAll: jest.fn().mockResolvedValue([]) };
  const useCase = new GetAllConversationsUseCase(mockRepo);
  const result = await useCase.execute();
  expect(result).toEqual([]);
});

// Test controller with mock use case
test('ConversationController.getAll returns 200', async () => {
  const mockUseCase = { execute: jest.fn().mockResolvedValue([]) };
  const controller = new ConversationController(mockUseCase, ...);
  await controller.getAll(req, res);
  expect(res.json).toHaveBeenCalled();
});
```

## Troubleshooting

### Issue: Module not found errors

**Solution**: Make sure all imports use correct paths relative to `src/`:

```typescript
// Correct
import { Conversation } from '../../../core/domain/entities';

// Incorrect
import { Conversation } from 'core/domain/entities';
```

### Issue: Circular dependencies

**Solution**: Ensure dependency direction is correct:
- Presentation → Application → Domain
- Infrastructure → Domain (implements interfaces)
- Never reverse direction

### Issue: Type mismatches

**Solution**: Use mappers to convert between layers:
```typescript
// Domain entity → DTO
const dto = ConversationMapper.toDTO(conversation);

// Database model → Domain entity
const entity = ConversationMapper.toDomain(dbModel);
```

## Further Reading

- [Clean Architecture Book](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) by Robert C. Martin
- [Domain-Driven Design](https://en.wikipedia.org/wiki/Domain-driven_design)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
