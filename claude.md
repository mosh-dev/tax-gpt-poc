# Tax-GPT Implementation Plan

## Project Overview
AI-assisted tax submission helper for Canton Zurich, Switzerland using locally hosted LLM.

## Configuration
- **Frontend**: Angular 20+ with SCSS
- **Backend**: Node.js/Express with TypeScript
- **AI Framework**: Mastra
- **LLM**: LMStudio at `<YOUR_LMSTUDIO_URL>` (configured in `server/.env`)
- **Model**: openai/gpt-oss-20b
- **Tax Region**: Canton Zurich, Switzerland
- **Data Source**: Mock data initially (web API integration later)

## Key Features
1. Conversational UI with SSE streaming for real-time responses
2. AI-powered tax tips and guidance based on user data
3. Tool calling system with user confirmation modals
4. Interactive Q&A flow customized to user's tax situation
5. Tax summary PDF generation through AI tools
6. Tax data modal for viewing and editing user information
7. Document upload with OCR processing (images and PDFs) - STANDALONE (No system dependencies)

## OCR Document Processing (Standalone - No System Dependencies)

### Overview
The application supports uploading tax documents (images and PDFs) with a deferred processing workflow. All OCR is handled by pure JavaScript libraries - no system-wide installations required.

### System Requirements
NO SYSTEM DEPENDENCIES REQUIRED! All OCR processing runs through npm packages:

**Dependencies (automatically installed):**
```bash
npm install tesseract.js pdfjs-dist canvas pdf-parse sharp
```

**What you get:**
- `tesseract.js` - Pure JavaScript Tesseract OCR (no binary needed)
- `pdfjs-dist` - Mozilla's PDF.js for PDF rendering
- `canvas` - Node.js canvas implementation (has prebuilt binaries)
- `pdf-parse` - Fast text extraction from digital PDFs
- `sharp` - Image preprocessing (has prebuilt binaries)

**Language Models (auto-downloaded on first use):**
- English: `eng.traineddata` (approximately 15 MB)
- German: `deu.traineddata` (approximately 12 MB)
- Stored in: `server/storage/tesseract-lang/`

First OCR run will download language files automatically (10-20 seconds), then cached for future use.

### Features
- **Multi-format support**: JPG, PNG, BMP, TIFF, WebP, PDF
- **Multi-language OCR**: English + German (Swiss tax documents)
- **Hybrid PDF processing**:
  - Digital PDFs: Fast text extraction (embedded text)
  - Scanned PDFs: Automatic OCR fallback (image-based)
  - Multi-page support: Process up to 10 pages per document
- **Batch processing**: Upload multiple documents at once
- **Smart preprocessing**: Auto-enhancement for better accuracy
- **Real-time extraction**: Extract text and send to AI for analysis

### Architecture

**Backend Structure:**
```
server/src/services/ocr/
├── types.ts              # TypeScript type definitions
├── config.ts             # OCR configuration and presets
├── ocr-service.ts        # Main OCR service
├── processors/
│   ├── base-processor.ts    # Abstract base class
│   ├── image-processor.ts   # Image OCR implementation
│   ├── pdf-processor.ts     # PDF OCR (future enhancement)
│   └── index.ts             # Processor exports
└── index.ts              # Module exports
```

**Key Components:**
1. **OCRService**: Main service coordinating document processing
2. **ImageProcessor**: Handles image OCR with preprocessing
3. **PDFProcessor**: Placeholder for future PDF support
4. **Configuration System**: Quality presets and Swiss canton language configs

### Deferred Processing Workflow

**User Flow:**
1. Click attachment button in chat input
2. Select files (images/PDFs) - shows preview with filename and size
3. Optionally type a message/question
4. Click Send button
5. Files upload to server → receive unique IDs
6. AI agent detects file IDs in message
7. AI agent calls `process-documents` tool
8. OCR processes documents on-demand
9. AI analyzes extracted text and responds

**Benefits:**
- Preview files before sending
- Add/remove files freely
- Type contextual questions
- AI-triggered OCR (only when needed)
- Better error handling

**API Endpoints:**
- `POST /api/files/upload` - Upload files, get IDs (no OCR yet)
- Tool: `process-documents` - AI agent processes files with OCR

**Request Parameters:**
- `file/files`: Document file(s)
- `language`: Optional ('eng', 'deu', 'fra', 'ita')
- `canton`: Optional (e.g., 'zurich', 'geneva') - auto-selects language
- `quality`: Optional ('fast', 'balanced', 'accurate') - default: 'balanced'

**Response Format:**
```json
{
  "success": true,
  "filename": "tax-document.jpg",
  "extractedText": "Extracted text content...",
  "language": "eng+deu",
  "wordCount": 245,
  "status": "completed",
  "metadata": {
    "fileType": "image",
    "fileSize": 1024000,
    "processingTime": 1523,
    "preprocessed": true,
    "timestamp": "2025-01-17T10:30:00Z"
  }
}
```

### Quality Presets

**Fast** (oem: 0, legacy engine):
- Faster processing
- Lower accuracy
- Best for clean, high-quality scans

**Balanced** (oem: 3, LSTM engine - default):
- Good balance of speed and accuracy
- Recommended for most use cases
- Includes image preprocessing

**Accurate** (oem: 3 + OSD):
- Highest accuracy
- Slower processing
- Best for low-quality or rotated documents

### Centralized Storage Architecture

All files are stored in `server/storage/` for easy Docker volume mounting:

```
server/storage/                (Mount as Docker volume)
├── uploads/                   User uploaded files
│   └── [uuid].pdf            Files with unique IDs
├── pdfs/                      Generated tax PDFs
│   └── Tax_Return_*.pdf      Generated documents
├── temp/                      Temporary OCR files
│   └── temp-pdf-ocr/         PDF page images
└── tesseract-lang/           Tesseract language data
    ├── eng.traineddata        English model (auto-downloaded)
    └── deu.traineddata        German model (auto-downloaded)
```

**Docker Volume Mount:**
```dockerfile
volumes:
  - ./server/storage:/app/server/storage
```

**Auto-Cleanup:**
- Uploaded files: Deleted after 1 hour
- Temp files: Deleted immediately after processing
- Generated PDFs: Kept permanently (user downloads)

### Implemented Features
- [x] Multi-page PDF processing (up to 10 pages)
- [x] Digital PDF text extraction with OCR fallback
- [x] Hybrid PDF processing strategy
- [x] Deferred upload workflow
- [x] Standalone OCR (no system dependencies)
- [x] Centralized storage architecture

### Future Enhancements
- [ ] Vision AI integration for multimodal LLMs
- [ ] Structured data extraction (amounts, dates, categories)
- [ ] Document classification (Lohnausweis, receipts, invoices)
- [ ] Swiss tax form auto-fill from extracted data
- [ ] Increase page limit beyond 10 pages
- [ ] Parallel page processing for faster multi-page PDFs

## Implementation Phases

### Phase 1: Project Setup ✓
1. ✓ Initialize Angular workspace and Express server structure
2. ✓ Install dependencies: Mastra, AI SDK, Angular Material
3. ✓ Configure TypeScript for both frontend/backend
4. ✓ Setup development scripts (concurrent frontend/backend)

### Phase 2: Backend (Node.js/Express) ✓
5. ✓ Create Express server with CORS and error handling
6. ✓ Setup Mastra agent with LMStudio connection (configured via `server/.env`)
7. ✓ Create chat endpoint with SSE streaming support
8. ✓ Implement tool calling infrastructure

### Phase 3: Mastra AI Integration ✓
9. ✓ Configure OpenAI-compatible provider for LMStudio (gpt-oss-20b)
10. ✓ Create tax assistant agent with Zurich tax system prompts
11. ✓ Setup conversation memory and context management
12. ✓ Add tools for tax PDF generation
13. ✓ Implement SSE streaming for real-time responses

### Phase 4: Angular Frontend ✓
14. ✓ Create chat interface with message history
15. ✓ Add tax data modal component
16. ✓ Implement SSE streaming service for real-time updates
17. ✓ Add auto-scrolling and smooth UX
18. ✓ Implement tool call confirmation modals
19. ✓ Add loading states and error handling

### Phase 5: Documentation ✓
20. ✓ Handle LMStudio connection errors gracefully
21. ✓ Write setup and usage documentation

### Phase 6: OCR Document Processing ✓
22. ✓ Install standalone OCR dependencies (tesseract.js, pdfjs-dist, canvas, pdf-parse, sharp, multer)
23. ✓ Create modular OCR service with extensible processor architecture
24. ✓ Implement image preprocessing and OCR extraction with tesseract.js
25. ✓ Implement hybrid PDF processing (digital text + OCR fallback)
26. ✓ Add deferred file upload API (upload first, process later via AI tool)
27. ✓ Integrate file upload UI in chat interface with preview
28. ✓ Add document selection, preview (filename + size), and removal
29. ✓ Create AI agent tool (process-documents) for on-demand OCR
30. ✓ Centralize storage architecture for Docker volume mounting
31. ✓ Update documentation with standalone setup instructions

## Technology Stack

### Core Dependencies
- **@mastra/core** - AI agent framework
- **@ai-sdk/openai-compatible** - LMStudio connection
- **express** - Backend server with SSE support
- **@angular/core** - Frontend framework
- **@angular/material** - UI components
- **rxjs** - Observable-based reactive programming

### OCR Dependencies (Standalone - No System Requirements)
- **tesseract.js** - Pure JavaScript Tesseract OCR (no system binaries)
- **pdfjs-dist** - Mozilla's PDF.js for PDF rendering in Node.js
- **canvas** - Node.js canvas implementation with prebuilt binaries
- **pdf-parse** - Fast text extraction from digital PDFs
- **sharp** - High-performance image processing with prebuilt binaries
- **multer** - File upload middleware for Express
- **@types/multer** - TypeScript types for multer

### Development Dependencies
- **typescript** - Type safety
- **ts-node-dev** - Backend development
- **concurrently** - Run frontend/backend together
- **@types/node** - Node.js types
- **@types/express** - Express types

## Project Structure

```
tax-gpt/
├── client/                 # Angular frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── chat/              # Chat interface with file upload
│   │   │   │   └── tax-data-modal/    # Tax data modal
│   │   │   ├── services/
│   │   │   │   └── api.service.ts     # API service (SSE + file upload)
│   │   │   └── models/                # TypeScript interfaces
│   │   └── ...
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── index.ts          # Main server file
│   │   ├── config/
│   │   │   └── storage.ts           # Centralized storage configuration
│   │   ├── routes/
│   │   │   ├── chat.ts              # SSE streaming chat route
│   │   │   └── files.ts             # File upload route (deferred processing)
│   │   ├── services/
│   │   │   ├── tax-agent.ts         # Mastra AI agent
│   │   │   ├── pdf-generator.ts     # PDF generation service
│   │   │   └── ocr/                 # OCR service module
│   │   │       ├── types.ts         # Type definitions
│   │   │       ├── config.ts        # OCR configuration
│   │   │       ├── ocr-service.ts   # Main OCR service
│   │   │       ├── processors/      # Document processors
│   │   │       │   ├── base-processor.ts
│   │   │       │   ├── image-processor.ts (tesseract.js)
│   │   │       │   └── pdf-processor.ts (pdfjs-dist + OCR)
│   │   │       └── index.ts
│   │   ├── tools/            # Mastra tools
│   │   │   ├── generate-tax-pdf.ts
│   │   │   └── process-documents-tool.ts
│   │   └── types/            # TypeScript types
│   ├── storage/              # Centralized storage (Docker volume)
│   │   ├── uploads/          # User uploaded files
│   │   ├── pdfs/             # Generated tax PDFs
│   │   ├── temp/             # Temporary OCR files
│   │   └── tesseract-lang/   # Tesseract language data
│   ├── tsconfig.json
│   └── package.json
├── package.json            # Root package (scripts)
└── CLAUDE.md              # This file (implementation plan)
```

## API Endpoints

### Backend API (Implemented)
- `POST /api/chat` - SSE streaming chat with AI agent (includes tool calling)
- `GET /api/health` - Health check
- `POST /api/files/upload` - Upload files and get unique IDs (no OCR yet, deferred processing)
- `GET /api/files/:id` - Get file metadata by ID
- `DELETE /api/files/:id` - Delete uploaded file by ID
- `GET /downloads/:filename` - Download generated tax PDF

### SSE Event Types
- `connected` - Connection established
- `chunk` - Text content chunk
- `reasoning` - AI reasoning process
- `tool-call` - Tool invocation request
- `tool-result` - Tool execution result
- `done` - Stream completion
- `error` - Error occurred

## Swiss Tax Considerations (Canton Zurich)

### Tax Forms
- Annual tax return (Steuererklärung)
- Income declaration (Lohnausweis)
- Wealth declaration
- Deduction forms

### Key Deductions
- Professional expenses
- Healthcare costs
- Pension contributions (Pillar 2, 3a)
- Childcare costs
- Commuting expenses
- Education expenses

### AI Agent Prompts
The Mastra agent will be configured with:
- Swiss tax law knowledge (Canton Zurich specific)
- Form filling guidance
- Deduction recommendations
- Tax optimization tips
- Multilingual support (German, French, English)

## Development Workflow

1. **Start LMStudio**: Ensure your LMStudio server is running with gpt-oss-20b (URL configured in `server/.env`)
2. **Backend**: `cd server && npm run dev` (port 3000)
3. **Frontend**: `cd client && npm start` (port 4200)
4. **Both**: `npm run dev` from root (using concurrently)

## Recent Implementation Updates

### SSE Streaming Chat with Tool Calling (Latest)

**Completed Features:**
1. ✓ Full SSE event handling for streaming AI responses
2. ✓ Type-safe event system with comprehensive TypeScript definitions
3. ✓ Auto-scrolling chat interface with smooth UX
4. ✓ Proper resource cleanup and client disconnect handling
5. ✓ Tool calling support with modal confirmations

**Key Technical Implementation:**

#### Server-Side (`/server/src/routes/chat.ts`)
- **Complete Event Handling**: All Mastra stream events properly handled
  - `reasoning-start`, `reasoning-delta`, `reasoning-finish` - AI thinking process
  - `text-start`, `text-delta`, `text-finish` - Response generation
  - `tool-call`, `tool-result` - Tool execution lifecycle
  - `step-start`, `step-finish` - Step completion tracking
  - `error`, `finish` - Error handling and stream completion
- **Client Disconnect Detection**: Passive `res.writable` check to stop streaming when client disconnects
- **StreamEvent Interface**: Soft-typed interface for flexible event handling with Mastra's generic types
- **Type Casting**: `const event = rawEvent as StreamEvent` to work with Mastra's `ChunkType<undefined>`

#### Client-Side (`/client/src/app/services/api.service.ts`)
- **Exported Type System**:
  ```typescript
  export type StreamEventType =
    'connected' | 'chunk' | 'reasoning' | 'reasoning-finish' |
    'step-finish' | 'text-finish' | 'tool-call' | 'tool-result' |
    'done' | 'error' | 'unknown';

  export interface StreamEvent {
    type: StreamEventType;
    content?: string;
    toolName?: string;
    toolCallId?: string;
    args?: any;
    result?: any;
    error?: string;
    timestamp: string;
    eventType?: string;
    raw?: any;
  }
  ```
- **Observable SSE Stream**: `streamMessageWithTools()` returns `Observable<StreamEvent>`
- **Proper SSE Parsing**: Handles `data: {...}\n\n` format with buffering for incomplete messages

#### Chat Component (`/client/src/app/components/chat/chat.ts`)
- **Auto-Scroll Implementation**:
  - `AfterViewChecked` lifecycle hook for DOM updates
  - `@ViewChild('messagesContainer')` for direct element access
  - `triggerScroll()` method called after: user messages, assistant placeholders, SSE connection, each chunk, modal messages
  - Smooth scrolling to bottom as tokens stream in real-time
- **Event Handling**:
  - `firstChunkLoaded` flag tracks when first event arrives (reasoning or text)
  - Completion logic removes empty messages only if no events were received
  - All event types properly handled with appropriate UI updates
- **Type Safety**: Imports `StreamEvent` and `StreamEventType` for full type checking

#### UI/UX (`/client/src/app/components/chat/chat.scss`)
- **Fixed Layout**: Changed `:host` from `overflow-y: auto` to `overflow: hidden`
- **Scroll Container**: Only `.messages-container` scrolls, preventing UI shift during typing
- **Responsive Design**: Proper flexbox layout for header, messages, and input sections

**Lessons Learned:**
1. Mastra's generic typing (`ChunkType<undefined>`) requires soft-typed interfaces with type assertions
2. SSE cleanup should use passive checks (`res.writable`) rather than event listeners
3. Angular's `AfterViewChecked` is essential for scroll-to-bottom during streaming updates
4. `firstChunkLoaded` flag needed to distinguish between "no response" vs "reasoning-only response"
5. Proper event type documentation improves developer experience and maintainability

**Files Modified:**
- `/server/src/routes/chat.ts` - Complete event handling, client disconnect detection
- `/server/src/services/tax-agent.ts` - Return type updates for streaming
- `/client/src/app/services/api.service.ts` - Exported type system, SSE parsing
- `/client/src/app/components/chat/chat.ts` - Event handling, auto-scroll, type imports
- `/client/src/app/components/chat/chat.html` - Template reference for scroll container
- `/client/src/app/components/chat/chat.scss` - Fixed overflow behavior

### Standalone OCR Document Processing (Latest)

**Completed Features:**
1. ✓ Standalone OCR with no system dependencies (pure npm packages)
2. ✓ Deferred upload workflow (select → preview → upload → AI processes)
3. ✓ Multi-format support (JPG, PNG, BMP, TIFF, WebP, PDF)
4. ✓ Multi-language OCR (English + German for Swiss documents)
5. ✓ Hybrid PDF processing (digital text extraction + OCR fallback)
6. ✓ Centralized storage architecture for Docker volume mounting
7. ✓ AI agent tool for on-demand document processing

**Key Technical Implementation:**

#### Storage Architecture (`/server/src/config/storage.ts`)
- **Centralized Storage Root**: All files in `server/storage/` for easy Docker mounting
- **Storage Paths**:
  ```typescript
  export const STORAGE_PATHS = {
    uploads: path.join(STORAGE_ROOT, 'uploads'),       // User uploads
    pdfs: path.join(STORAGE_ROOT, 'pdfs'),             // Generated PDFs
    temp: path.join(STORAGE_ROOT, 'temp'),             // Temp OCR files
    tesseract: path.join(STORAGE_ROOT, 'tesseract-lang') // Language data
  } as const;
  ```
- **Docker Volume**: Mount single directory: `./server/storage:/app/server/storage`

#### Image Processing (`/server/src/services/ocr/processors/image-processor.ts`)
- **Tesseract.js Worker**: Pure JavaScript OCR with custom language path
  ```typescript
  const langPath = getStoragePath('tesseract');
  worker = await createWorker(language, config.oem, {
    langPath: langPath,
    cachePath: langPath,
  });
  ```
- **Preprocessing Pipeline**: Sharp-based image enhancement (grayscale, normalize, sharpen)
- **Language Support**: English + German (`eng+deu`) for Swiss tax documents
- **Auto-cleanup**: Processed images deleted after OCR

#### PDF Processing (`/server/src/services/ocr/processors/pdf-processor.ts`)
- **Hybrid Strategy**:
  1. Try fast digital text extraction with `pdf-parse`
  2. Fall back to OCR for scanned/image-based PDFs
- **PDF.js Rendering**:
  ```typescript
  const renderContext = {
    canvasContext: context,
    canvas: canvas,  // Both canvas and context required
    viewport: viewport
  };
  await page.render(renderContext).promise;
  ```
- **CommonJS Import Fix**: Use `require()` for pdf-parse (not ES6 import)
- **Multi-page Support**: Process up to 10 pages per document

#### Deferred Upload Workflow (`/client/src/app/components/chat/`)
- **File Selection**: Users select files without immediate upload
- **Preview Display**: Show filename + formatted size (KB/MB)
- **Upload on Send**: Files upload only when message is sent
- **File ID Injection**: IDs embedded in message: `[fileId: uuid]`
- **AI Tool Processing**: Agent calls `process-documents` tool with IDs

#### AI Agent Tool (`/server/src/tools/process-documents-tool.ts`)
- **Tool Integration**: Added to Mastra agent tools
- **On-Demand OCR**: Process files only when AI agent needs them
- **Quality Presets**: Fast, Balanced (default), Accurate
- **Batch Processing**: Handle multiple file IDs in single call

**Lessons Learned:**
1. Tesseract.js requires custom `langPath` and `cachePath` configuration for storage control
2. PDF.js render context needs both `canvas` and `canvasContext` properties
3. pdf-parse must be imported with `require()` (CommonJS module)
4. Deferred upload workflow provides better UX than immediate processing
5. Centralized storage makes Docker deployment significantly easier
6. Hybrid PDF processing (digital + OCR) provides best balance of speed and accuracy

**Files Modified/Created:**
- `/server/src/config/storage.ts` - Centralized storage configuration (Created)
- `/server/src/services/ocr/` - Complete OCR service module (Created)
  - `types.ts`, `config.ts`, `ocr-service.ts`
  - `processors/base-processor.ts`, `image-processor.ts`, `pdf-processor.ts`
- `/server/src/routes/files.ts` - Deferred file upload API (Created)
- `/server/src/tools/process-documents-tool.ts` - AI agent tool (Created)
- `/server/src/services/tax-agent.ts` - Added processDocumentsTool
- `/server/src/index.ts` - Updated to use centralized storage paths
- `/client/src/app/services/api.service.ts` - Added uploadFiles method
- `/client/src/app/components/chat/` - File selection UI with preview

### Code Cleanup - Removed Unused Features

**Files Removed:**
- `client/src/app/components/file-upload/` - Entire file upload component (HTML, SCSS, TS)
- `server/src/routes/pdf.ts` - PDF upload route
- `server/src/routes/tax-data.ts` - Tax data API route
- `server/src/routes/upload.ts` - Upload handling route
- `server/src/services/pdf-extractor.ts` - PDF extraction service
- `IMPLEMENTATION_SUMMARY.md` - Old summary file

**Rationale:**
The application was simplified to focus on the core conversational interface with tool calling. PDF upload and separate tax data APIs were removed in favor of:
- Direct chat-based interaction
- Tool-triggered tax data modal
- AI agent handles data through conversation context
- Cleaner architecture with fewer moving parts

## Current Status

✅ **Fully Implemented:**
- SSE streaming chat interface with real-time token streaming
- Tool calling with user confirmation modals
- Tax data modal component for viewing/editing user information
- PDF generation through Mastra tools (tax return summaries)
- Standalone OCR document processing (images + PDFs)
  - Deferred upload workflow (select → preview → upload → AI processes)
  - Multi-language support (English + German)
  - Hybrid PDF processing (digital text extraction + OCR fallback)
  - Centralized storage architecture for Docker volumes
- Auto-scrolling UX with smooth message updates
- Type-safe event system for SSE events
- Comprehensive error handling and graceful degradation

## Next Steps

Potential future enhancements:
1. Add more Mastra tools (tax calculations, form validation, deduction optimizer)
2. Implement data persistence (database integration for user profiles)
3. Expand multi-language support (add French and Italian for other Swiss cantons)
4. Authentication and user accounts with session management
5. Integration with Swiss e-government APIs (eTax submission)
6. Advanced tax optimization recommendations based on user profile
7. Structured data extraction from documents (amounts, dates, categories)
8. Document classification (Lohnausweis, receipts, invoices, etc.)
9. Swiss tax form auto-fill from extracted OCR data
