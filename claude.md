# Tax-GPT Implementation Plan

## Project Overview
AI-assisted tax submission helper for Canton Zurich, Switzerland using locally hosted LLM.

## Configuration
- **Frontend**: Angular 20+ with SCSS
- **Backend**: Node.js/Express with TypeScript
- **AI Framework**: Mastra
- **LLM**: LMStudio at http://192.168.0.188:1234
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

## Implementation Phases

### Phase 1: Project Setup ✓
1. ✓ Initialize Angular workspace and Express server structure
2. ✓ Install dependencies: Mastra, AI SDK, Angular Material
3. ✓ Configure TypeScript for both frontend/backend
4. ✓ Setup development scripts (concurrent frontend/backend)

### Phase 2: Backend (Node.js/Express) ✓
5. ✓ Create Express server with CORS and error handling
6. ✓ Setup Mastra agent with LMStudio connection (http://192.168.0.188:1234)
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

## Technology Stack

### Core Dependencies
- **@mastra/core** - AI agent framework
- **@ai-sdk/openai-compatible** - LMStudio connection
- **express** - Backend server with SSE support
- **@angular/core** - Frontend framework
- **@angular/material** - UI components
- **rxjs** - Observable-based reactive programming

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
│   │   │   ├── components/    # UI components (chat, tax-data-modal)
│   │   │   ├── services/      # API services (SSE streaming)
│   │   │   └── models/        # TypeScript interfaces
│   │   └── ...
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── index.ts          # Main server file
│   │   ├── routes/           # API routes (chat with SSE)
│   │   ├── services/         # Business logic (tax-agent)
│   │   ├── tools/            # Mastra tools (generate-tax-pdf)
│   │   ├── config/           # Configuration (LMStudio)
│   │   └── types/            # TypeScript types
│   ├── tsconfig.json
│   └── package.json
├── package.json            # Root package (scripts)
└── CLAUDE.md              # This file (implementation plan)
```

## API Endpoints

### Backend API (Implemented)
- `POST /api/chat` - SSE streaming chat with AI agent (includes tool calling)
- `GET /api/health` - Health check

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

1. **Start LMStudio**: Ensure http://192.168.0.188:1234 is running with gpt-oss-20b
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
- SSE streaming chat interface
- Tool calling with user confirmation
- Tax data modal component
- PDF generation through Mastra tools
- Auto-scrolling UX
- Type-safe event system
- Error handling and graceful degradation

## Next Steps

Potential future enhancements:
1. Add more Mastra tools (tax calculations, form validation)
2. Implement data persistence (database integration)
3. Multi-language support (DE, FR, IT)
4. Authentication and user accounts
5. Integration with Swiss e-government APIs
6. Advanced tax optimization recommendations
7. Document upload with OCR (if needed in future)
