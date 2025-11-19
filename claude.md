# Tax-GPT - Project Guide

## Overview
AI tax assistant for Canton Zurich, Switzerland with local LLM.

## Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Node.js/Express, TypeScript
- **Database**: MongoDB (localhost:27017)
- **AI**: Mastra framework + LMStudio
- **Model**: openai/gpt-oss-20b
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

## MongoDB Integration

**Models:**
- **Conversation**: Metadata (title, tax year, timestamps)
- **Message**: Individual messages with tool calls
- **File**: Uploaded file metadata with TTL expiry (1 hour)

**Key Features:**
- Persistent conversation history
- Agent memory with context preservation
- Automatic message saving during streaming
- Graceful degradation (works without MongoDB)

**Memory Service** (`mongodb-memory.ts`):
- `getOrCreateConversation()` - Create/retrieve conversation
- `saveMessage()` - Save messages
- `getHistory()` - Load history
- `getAllConversations()` - List conversations
- `deleteConversation()` - Remove conversation

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

## Project Structure

```
tax-gpt/
├── client-react/         # React frontend
│   └── src/
│       ├── components/   # Chat UI, modals
│       ├── services/     # API service (SSE)
│       └── types/        # TypeScript types
├── server/               # Express backend
│   ├── src/
│   │   ├── config/       # Database, storage
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # AI agent, memory, OCR
│   │   └── tools/        # Mastra tools
│   └── storage/          # Centralized files (Docker volume)
└── package.json          # Root scripts
```

## API Endpoints

**Chat:**
- `POST /api/chat/stream-with-tools` - SSE streaming
- `GET /api/chat/conversations` - List all
- `GET /api/chat/conversations/:id` - Get one
- `DELETE /api/chat/conversations/:id` - Delete

**Files:**
- `POST /api/files/upload` - Upload, get IDs
- `GET /api/files/:id` - Get metadata
- `DELETE /api/files/:id` - Delete

**SSE Events:**
`connected`, `chunk`, `reasoning`, `tool-call`, `tool-result`, `done`, `error`

## Development

```bash
# Run both frontend & backend
npm run dev

# Separate terminals
cd server && npm run dev     # Port 3000
cd client-react && npm run dev # Port 5173
```

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
