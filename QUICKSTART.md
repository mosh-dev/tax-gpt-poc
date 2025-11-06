# Quick Start Guide

Get Tax-GPT running in 5 minutes!

## Prerequisites

- ✅ Node.js v18+ installed
- ✅ LMStudio running at `<YOUR_LMSTUDIO_URL>` with `openai/gpt-oss-20b` model loaded

## Steps

### 1. Install Dependencies

```bash
# From project root
npm install

# Install server dependencies
cd server && npm install && cd ..
```

### 2. Verify LMStudio is Running

Open your browser or use curl:
```bash
curl <YOUR_LMSTUDIO_URL>/models
```

You should see your loaded model in the response.

### 3. Start the Application

```bash
# From project root - starts both frontend and backend
npm run dev
```

This will start:
- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:4200

### 4. Open Your Browser

Navigate to: **http://localhost:4200**

You should see the Tax-GPT chat interface!

## First Steps

### Try These Questions:

1. "What tax deductions can I claim in Canton Zurich?"
2. "How much can I contribute to my Pillar 3a pension?"
3. "What professional expenses are deductible?"
4. "Explain Swiss wealth tax"

### Test the API:

```bash
# Health check
curl http://localhost:3000/api/health

# Get mock tax scenarios
curl http://localhost:3000/api/tax-data/scenarios

# Get sample tax data
curl http://localhost:3000/api/tax-data?scenario=single
```

## Troubleshooting

### Can't connect to LMStudio?

1. Check LMStudio is running
2. Verify the URL in `server/.env`:
   ```
   LMSTUDIO_URL=<YOUR_LMSTUDIO_URL>
   ```
3. Test connection: `curl <YOUR_LMSTUDIO_URL>/models`

### Port 3000 already in use?

Change the port in `server/.env`:
```env
PORT=3001
```

Then restart the server.

### Frontend not loading?

1. Check if port 4200 is free
2. Try: `cd client && npm start`
3. Look for errors in the terminal

## What's Next?

- Read the full [README.md](README.md) for detailed documentation
- Review the [implementation plan](claude.md)
- Upload a PDF tax document to test extraction
- Explore the mock tax scenarios

## Architecture Overview

```
┌─────────────────┐
│   Angular UI    │  Port 4200
│   (client/)     │
└────────┬────────┘
         │ HTTP
         ↓
┌─────────────────┐
│  Express API    │  Port 3000
│   (server/)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Mastra Agent   │
│  Tax Assistant  │
└────────┬────────┘
         │ OpenAI-compatible API
         ↓
┌─────────────────┐
│   LMStudio      │  <YOUR_LMSTUDIO_URL>
│  gpt-oss-20b    │
└─────────────────┘
```

## Development Commands

```bash
# Run both frontend and backend
npm run dev

# Run backend only
npm run dev:server

# Run frontend only
npm run dev:client

# Build for production
npm run build

# Build backend only
npm run build:server

# Build frontend only
npm run build:client
```

## Key Files

- `server/src/index.ts` - Main Express server
- `server/src/services/tax-agent.ts` - Mastra AI agent
- `server/src/config/lmstudio.ts` - LMStudio configuration
- `client/src/app/components/chat/` - Chat UI component
- `server/.env` - Environment configuration

## Need Help?

Check the full [README.md](README.md) for:
- Detailed API documentation
- Troubleshooting guide
- Configuration options
- Swiss tax features

Happy tax filing! 🇨🇭💰
