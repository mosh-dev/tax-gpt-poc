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
