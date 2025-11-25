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
- Tax PDF generation via Mastra tools
- Tool calling with user confirmation modals

## Important: Server Initialization

**Database, seeds, LLM client, and Mastra agent are all initialized in `server/src/mastra/mastra.ts` at module import time.** This ensures the `mastra` export is ready for the Mastra playground. The `server.ts` only handles DI container and routes.

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

**Important:** All collection names are centralized in `database-collections.ts`. Use these constants instead of hardcoded strings.

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
