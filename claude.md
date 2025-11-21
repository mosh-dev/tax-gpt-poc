# Tax-GPT - Project Guide

## Overview
AI tax assistant for Canton Zurich, Switzerland with local LLM.

## Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Node.js/Express, TypeScript
- **Database**: MongoDB
- **AI**: Mastra framework
- **Model**: openai/gpt compatible
- **OCR**: Tesseract.js, PDF.js (standalone, no system dependencies)

## Core Features
- SSE streaming chat with real-time responses
- MongoDB persistent conversation history
- Document OCR (images, PDFs) with deferred processing
- Tax PDF generation via AI tools
- Tool calling with user confirmation modals

## OCR Processing

**No system dependencies required** - Pure npm packages:
- `tesseract.js` - JavaScript OCR
- `pdfjs-dist` - PDF rendering
- `pdf-parse` - Digital PDF text extraction
- `sharp` - Image preprocessing

**Features:**
- Multi-format: JPG, PNG, BMP, TIFF, WebP, PDF
- Multi-language: English + German
- Hybrid PDF: Digital text extraction + OCR fallback
- Deferred processing: Upload → AI triggers OCR via tool
- Storage: `server/storage/` (centralized for Docker)

**Workflow:**
1. User uploads files → Get IDs
2. AI detects file IDs in message
3. AI calls `process-documents` tool
4. OCR processes on-demand
5. AI analyzes extracted text

## Project Structure

### Backend (server/src)

```
server/src/
├── api/                          # API Layer (Routes, Controllers, Middleware)
│   ├── controllers/              # HTTP Controllers (kebab-case)
│   │   ├── chat.controller.ts
│   │   ├── conversation.controller.ts
│   │   ├── file.controller.ts
│   │   └── index.ts
│   ├── routes/                   # API Routes (kebab-case with .routes.ts)
│   │   ├── auth.routes.ts
│   │   ├── chat.routes.ts
│   │   ├── conversation.routes.ts
│   │   ├── file.routes.ts
│   │   ├── employee.routes.ts
│   │   ├── workflow.routes.ts
│   │   ├── agent-config.routes.ts
│   │   ├── knowledge.routes.ts
│   │   └── index.ts
│   ├── middleware/               # HTTP Middleware (kebab-case)
│   │   └── auth.middleware.ts
│   └── index.ts                  # API exports
│
├── core/                         # Clean Architecture - Domain & Application
│   ├── domain/                   # Domain Layer (PascalCase)
│   │   ├── entities/             # Domain Entities
│   │   ├── value-objects/        # Value Objects
│   │   └── repositories/         # Repository Interfaces
│   └── application/              # Application Layer (PascalCase)
│       ├── use-cases/            # Use Cases
│       ├── dtos/                 # Data Transfer Objects
│       └── services/             # Service Interfaces
│
├── infrastructure/               # Infrastructure Layer (PascalCase)
│   ├── database/                 # Database implementations
│   │   └── mongodb/
│   │       └── repositories/     # Concrete repositories
│   └── services/                 # Service implementations
│       ├── ai/
│       ├── ocr/
│       ├── pdf/
│       └── storage/
│
├── config/                       # Configuration (kebab-case)
│   ├── database.ts
│   ├── database-collections.ts   # Collection name constants
│   ├── database-utils.ts         # Database utilities
│   ├── env.ts
│   ├── llm.ts
│   └── storage.ts
│
├── agent/                        # Mastra Agent (kebab-case)
│   ├── tools/                    # Agent tools
│   ├── workflows/                # Mastra workflows
│   ├── mastra-memory.ts
│   ├── setup.ts
│   └── tax-agent.ts
│
├── models/                       # Mongoose Models (kebab-case with .model.ts)
│   ├── conversation.model.ts
│   ├── message.model.ts
│   ├── file.model.ts
│   ├── user.model.ts
│   ├── employee.model.ts
│   ├── agent-config.model.ts
│   └── knowledge-base.model.ts
│
├── services/                     # Legacy/Utility Services (kebab-case)
│   ├── mongodb-memory.ts
│   ├── mongo-repository.ts
│   ├── file-service.ts
│   ├── ocr/
│   ├── rag/
│   └── hybrid-retrieval.ts
│
├── di/                           # Dependency Injection
│   └── container.ts
│
├── seeds/                        # Database seeds
│   └── employee-seed.ts
│
└── index.ts                      # Application entry point
```

### File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| **Controllers** | kebab-case + `.controller.ts` | `chat.controller.ts` |
| **Routes** | kebab-case + `.routes.ts` | `conversation.routes.ts` |
| **Middleware** | kebab-case + `.middleware.ts` | `auth.middleware.ts` |
| **Models** | kebab-case + `.model.ts` | `conversation.model.ts` |
| **Services** | kebab-case | `file-service.ts` |
| **Config** | kebab-case | `database.ts` |
| **Domain Entities** | PascalCase | `Conversation.ts` |
| **Value Objects** | PascalCase | `ConversationId.ts` |
| **Use Cases** | PascalCase + `UseCase.ts` | `CreateConversationUseCase.ts` |
| **DTOs** | PascalCase + `DTO.ts` | `ConversationDTO.ts` |
| **Repositories** | PascalCase + `Repository.ts` | `MongoConversationRepository.ts` |
| **Interfaces** | PascalCase with `I` prefix | `IAIAgentService.ts` |

## Key Dependencies

- **@mastra/core** - AI agent framework
- **@ai-sdk/openai-compatible** - LMStudio connection
- **express** - Backend with SSE
- **react** - Frontend
- **mongoose** - MongoDB ORM
- **tesseract.js** - OCR
- **pdfjs-dist** - PDF rendering
- **sharp** - Image processing
- **multer** - File uploads

## MongoDB Collections

### Application Collections
- `conversations` - Conversation metadata
- `messages` - Chat messages
- `files` - Uploaded file metadata
- `users` - User accounts
- `employees` - Employee/tax data
- `agent_config` - AI agent configuration
- `knowledge_base` - Knowledge base files
- `secrets` - API keys and secrets

### Mastra Collections (managed by framework)
- `mastra_threads` - Mastra conversation threads
- `mastra_messages` - Mastra agent messages
- `mastra_workflow_snapshot` - Workflow state snapshots
- `mastra_traces` - Agent execution traces
- `mastra_resources` - Mastra resources
- `mastra_scorers` - Mastra scorers
- `mastra_ai_spans` - AI execution spans

**Important:** All collection names are centralized in `config/database-collections.ts`. Use these constants instead of hardcoded strings.

## Current Status

**Fully Implemented:**
- SSE streaming chat with real-time responses
- MongoDB persistent conversation history
- Standalone OCR (images + PDFs, English + German)
- Tax PDF generation via Mastra tools
- Tool calling with user confirmation modals
- Deferred file upload workflow
- Centralized storage for Docker deployment
- Graceful degradation (works without MongoDB)
