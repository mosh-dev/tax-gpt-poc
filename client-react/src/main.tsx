import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ConversationProvider } from './contexts/ConversationContext'
import { ThemeProvider } from './contexts/ThemeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ConversationProvider>
          <App />
        </ConversationProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
