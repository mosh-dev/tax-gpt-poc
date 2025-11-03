# Tax-GPT - AI-Assisted Tax Helper for Canton Zurich

An intelligent tax assistant powered by local LLM (LMStudio) and built with Angular + Node.js + Mastra AI framework.

## Features

- Conversational AI tax assistant specialized in Canton Zurich regulations
- PDF document upload and extraction (Lohnausweis, receipts, etc.)
- Mock tax data for testing different scenarios
- Real-time chat with conversation history
- Local LLM processing (privacy-first, no cloud dependency)
- Swiss tax knowledge base (deductions, allowances, tax optimization)

## Architecture

```
tax-gpt/
├── client/          # Angular 20 frontend
│   ├── src/app/
│   │   ├── components/  # Chat and file upload UI
│   │   ├── services/    # API communication
│   │   └── models/      # TypeScript interfaces
├── server/          # Node.js/Express backend
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   ├── config/      # LMStudio configuration
│   │   └── types/       # TypeScript types
└── package.json     # Root scripts
```

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** (v9 or higher)
3. **LMStudio** running locally with a model loaded
   - Model: `openai/gpt-oss-20b` (or any compatible model)
   - URL: `http://192.168.0.188:1234` (configured in `.env`)

## Installation

### 1. Clone and Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..

# Client dependencies were installed during Angular setup
```

### 2. Configure LMStudio

1. Download and install [LMStudio](https://lmstudio.ai/)
2. Load a model (e.g., `openai/gpt-oss-20b`)
3. Start the local server in LMStudio
4. Note the server URL (default: `http://localhost:1234`)

### 3. Configure Environment Variables

The server `.env` file is already configured at `server/.env`:

```env
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:4200
LMSTUDIO_URL=http://192.168.0.188:1234
LMSTUDIO_MODEL=openai/gpt-oss-20b
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

Adjust `LMSTUDIO_URL` and `LMSTUDIO_MODEL` if needed.

## Running the Application

### Option 1: Run Both Frontend and Backend Together

```bash
# From project root
npm run dev
```

This starts:
- Backend server on `http://localhost:3000`
- Angular frontend on `http://localhost:4200`

### Option 2: Run Separately

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm start
```

## Usage

### 1. Access the Application

Open your browser to `http://localhost:4200`

### 2. Chat with the Tax Assistant

The chat interface loads automatically. You can:
- Ask questions about Canton Zurich tax regulations
- Get guidance on deductions and allowances
- Request help with specific tax situations
- Ask for form-filling instructions

**Example questions:**
- "What deductions can I claim as a single employee in Zurich?"
- "How much can I contribute to Pillar 3a?"
- "What professional expenses are deductible?"
- "Explain the difference between cantonal and federal tax"

### 3. Upload Tax Documents (PDF)

Use the file upload component to:
1. Drag and drop a PDF (Lohnausweis, receipts, etc.)
2. Or click to select a file
3. Click "Upload & Extract"
4. The system will extract text and parse tax-relevant data

### 4. Test with Mock Data

The backend provides mock tax scenarios:
- **Single Employee**: Young professional in Zurich
- **Married with Children**: Family with rental income
- **Self-Employed Freelancer**: Divorced freelancer with business expenses

Access via API:
```bash
# Get scenarios list
curl http://localhost:3000/api/tax-data/scenarios

# Get specific scenario data
curl http://localhost:3000/api/tax-data?scenario=single
curl http://localhost:3000/api/tax-data?scenario=married
curl http://localhost:3000/api/tax-data?scenario=freelancer
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Chat
```
POST /api/chat
Body: {
  "message": "Your question",
  "conversationHistory": [...]
}
```

### Tax Data
```
GET /api/tax-data?scenario=single|married|freelancer
GET /api/tax-data/scenarios
```

### File Upload
```
POST /api/upload/pdf
Content-Type: multipart/form-data
Body: file (PDF)
```

### Generate Tax Form
```
POST /api/chat/generate-form
Body: {
  "taxData": { ... }
}
```

## Project Structure Details

### Backend Services

**tax-agent.ts**: Mastra-powered AI agent
- Configured with Swiss tax system prompts
- Specializes in Canton Zurich regulations
- Handles conversation with context awareness

**lmstudio.ts**: LMStudio connection
- OpenAI-compatible API configuration
- Model selection and management

**pdf-extractor.ts**: PDF processing
- Text extraction from PDFs
- Swiss document parsing (Lohnausweis, etc.)
- Number format handling (CHF)

**mock-data.ts**: Test data
- Three predefined tax scenarios
- Realistic Swiss tax situations

### Frontend Components

**Chat Component**: Main conversational interface
- Message history display
- Real-time AI responses
- Typing indicators
- Error handling

**File Upload Component**: PDF handling
- Drag and drop support
- File validation
- Extraction result display

**API Service**: Backend communication
- HTTP client wrapper
- Type-safe API calls
- Error handling

## Configuration Files

### Backend TypeScript (server/tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  }
}
```

### Environment Variables (server/.env)
- `PORT`: Server port (default: 3000)
- `LMSTUDIO_URL`: LMStudio API endpoint
- `LMSTUDIO_MODEL`: Model name
- `CLIENT_URL`: Frontend URL for CORS
- `MAX_FILE_SIZE`: Max PDF upload size (bytes)

## Troubleshooting

### LMStudio Connection Error

**Problem**: "Failed to connect to LMStudio"

**Solutions**:
1. Verify LMStudio is running
2. Check the URL in `server/.env`
3. Ensure model is loaded in LMStudio
4. Test connection: `curl http://192.168.0.188:1234/v1/models`

### PDF Upload Fails

**Problem**: PDF upload returns error

**Solutions**:
1. Check file is valid PDF
2. Verify file size < 10MB
3. Check server console for details

### Chat Not Responding

**Problem**: Messages send but no response

**Solutions**:
1. Check LMStudio is running and model loaded
2. Look for errors in server console
3. Verify network connectivity to LMStudio
4. Check conversation history isn't too large

### Port Already in Use

**Problem**: "Port 3000 already in use"

**Solutions**:
1. Change PORT in `server/.env`
2. Or kill process using port 3000:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F

   # Linux/Mac
   lsof -ti:3000 | xargs kill
   ```

## Development

### Build for Production

```bash
# Build both frontend and backend
npm run build

# Build separately
npm run build:server
npm run build:client
```

### Run Production Build

```bash
# Start production server
cd server
npm start
```

Serve the built Angular app (`client/dist`) with your preferred static server.

### Code Structure

- **TypeScript**: Strict type checking enabled
- **ES Modules**: Modern JavaScript syntax
- **Async/Await**: Promise-based async handling
- **Error Handling**: Comprehensive try-catch blocks
- **CORS**: Configured for local development

## Swiss Tax Features

### Canton Zurich Specific

- Tax rates and brackets
- Municipal variations
- Cantonal deductions
- Local tax optimization strategies

### Supported Topics

- Income declaration (employment, self-employment, investments)
- Deductions (professional expenses, healthcare, pension)
- Wealth declaration
- Pillar 2 and 3a contributions
- Tax form assistance
- Deadlines and requirements

## Technology Stack

### Frontend
- **Angular 20**: Modern web framework
- **TypeScript**: Type-safe development
- **RxJS**: Reactive programming
- **SCSS**: Styling

### Backend
- **Node.js**: JavaScript runtime
- **Express 5**: Web framework
- **TypeScript**: Type safety
- **Mastra**: AI agent framework
- **AI SDK**: LLM integration
- **pdf-parse**: PDF processing

### AI
- **LMStudio**: Local LLM hosting
- **Mastra Framework**: Agent orchestration
- **OpenAI-compatible API**: Standard interface

## Security Considerations

- **Local LLM**: No data sent to cloud
- **CORS Protection**: Restricts cross-origin requests
- **File Validation**: PDF-only uploads
- **Size Limits**: 10MB max file size
- **Input Sanitization**: Prevents injection attacks

## Future Enhancements

Potential improvements:
- [ ] Multi-language support (DE, FR, IT)
- [ ] PDF form generation (actual tax forms)
- [ ] Data persistence (save user data)
- [ ] Authentication and user accounts
- [ ] Real web API integration
- [ ] More sophisticated PDF parsing
- [ ] Tax calculation engine
- [ ] Document templates
- [ ] Export to Excel/PDF
- [ ] Calendar integration for deadlines

## License

Private project - All rights reserved

## Support

For issues or questions:
1. Check this README
2. Review server console logs
3. Check LMStudio connection
4. Verify all dependencies installed

## Credits

Built with:
- [Angular](https://angular.dev/)
- [Mastra AI](https://mastra.ai/)
- [LMStudio](https://lmstudio.ai/)
- [Vercel AI SDK](https://sdk.vercel.ai/)
