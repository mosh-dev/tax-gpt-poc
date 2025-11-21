# Tax-GPT - AI Tax Assistant for Canton Zurich

AI-powered tax assistant using local LLM (LMStudio), React, Node.js, and MongoDB.

## Features

- Conversational AI specialized in Canton Zurich tax regulations
- Real-time streaming responses with SSE
- Persistent conversation history with MongoDB
- Document OCR processing (images and PDFs) - standalone, no system dependencies
- Tax PDF generation through AI tools
- Local LLM processing (privacy-first)

## Prerequisites

- **Node.js** v18+
- **MongoDB** running on localhost:27017
- **LMStudio** with a model loaded (e.g., `openai/gpt-oss-20b`)

## Quick Start

```bash
# Install dependencies
npm install
cd server && npm install && cd ..
cd client-react && npm install && cd ..

# Configure server/.env
LMSTUDIO_URL=<YOUR_LMSTUDIO_URL>
MONGODB_URI=mongodb://localhost:27017/tax-gpt

# Start MongoDB (ensure it's running on port 27017)

# Run application
npm run dev
```

Open `http://localhost:5173` in your browser.

## Environment Variables

Edit `server/.env`:
```env
```

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, Mastra AI, MongoDB
- **AI**: LMStudio (local LLM), Tesseract.js (OCR)
- **Database**: MongoDB (conversations, messages, files)
