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
1. Conversational UI for tax document generation
2. AI-powered tax tips and guidance based on user data
3. PDF document upload and data extraction
4. Interactive Q&A flow customized to user's tax situation
5. Swiss tax form generation

## Implementation Phases

### Phase 1: Project Setup ✓
1. ✓ Initialize Angular workspace and Express server structure
2. Install dependencies: Mastra, AI SDK, pdf-parse, Angular Material
3. Configure TypeScript for both frontend/backend
4. Setup development scripts (concurrent frontend/backend)

### Phase 2: Backend (Node.js/Express)
5. Create Express server with CORS and error handling
6. Setup Mastra agent with LMStudio connection (http://192.168.0.188:1234)
7. Build mock Swiss tax data API (income, deductions, Zurich-specific rules)
8. Implement PDF upload/parsing endpoint
9. Create chat endpoint that sends context to Mastra agent

### Phase 3: Mastra AI Integration
10. Configure OpenAI-compatible provider for LMStudio (gpt-oss-20b)
11. Create tax assistant agent with Zurich tax system prompts
12. Setup conversation memory and context management
13. Add tools/functions for tax calculations and form generation

### Phase 4: Angular Frontend
14. Create chat interface with message history
15. Build file upload component for PDFs
16. Add tax data visualization components
17. Implement HTTP services for backend communication
18. Add loading states and error handling

### Phase 5: Testing & Documentation
19. Create mock scenarios (typical Zurich taxpayer profiles)
20. Test end-to-end flow: upload PDF → chat → generate tax docs
21. Handle LMStudio connection errors gracefully
22. Write setup and usage documentation

## Technology Stack

### Core Dependencies
- **@mastra/core** - AI agent framework
- **@ai-sdk/openai-compatible** - LMStudio connection
- **express** - Backend server
- **pdf-parse** - PDF data extraction
- **@angular/core** - Frontend framework
- **@angular/material** - UI components (optional)

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
│   │   │   ├── components/    # UI components
│   │   │   ├── services/      # API services
│   │   │   └── models/        # TypeScript interfaces
│   │   └── ...
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── index.ts          # Main server file
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic (Mastra, PDF, etc.)
│   │   ├── config/           # Configuration
│   │   └── types/            # TypeScript types
│   ├── tsconfig.json
│   └── package.json
├── package.json            # Root package (scripts)
├── instructions.md         # Original requirements
└── claude.md              # This file (implementation plan)
```

## API Endpoints (Planned)

### Backend API
- `POST /api/chat` - Send message to AI agent
- `POST /api/upload-pdf` - Upload and extract PDF data
- `GET /api/tax-data` - Get mock user tax data
- `POST /api/generate-form` - Generate tax form based on conversation
- `GET /api/health` - Health check

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

## Next Steps

1. Install all dependencies
2. Configure backend Express server
3. Setup Mastra with LMStudio connection
4. Build Angular components
5. Test integration
6. Add Swiss tax-specific features
