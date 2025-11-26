import { useState, useEffect } from 'react';
import { useSearchParams, Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout/AppLayout';
import Chat from './components/Chat/Chat';
import Welcome from './components/Welcome/Welcome';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login/Login';
import AgentConfig from './components/AgentConfig/AgentConfig';
import EmployeeData from './components/EmployeeData/EmployeeData';
import { authService } from './services/auth';
import { AUTH_ERROR_EVENT } from './services/api';
import { useConversations } from "./contexts/useConversations.ts";
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/Toast/ToastContainer';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const { refreshConversations } = useConversations();

  // Listen for auth errors (token expired, refresh failed)
  useEffect(() => {
    const handleAuthError = () => {
      authService.logout();
      setIsAuthenticated(false);
    };

    window.addEventListener(AUTH_ERROR_EVENT, handleAuthError);
    return () => {
      window.removeEventListener(AUTH_ERROR_EVENT, handleAuthError);
    };
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    refreshConversations().then();
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <ToastProvider>
        <Login onLoginSuccess={handleLoginSuccess} />
        <ToastContainer />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <ErrorBoundary>
        <AppLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/agent-config" element={<AgentConfig />} />
            <Route path="/employee-data" element={<EmployeeData />} />
          </Routes>
        </AppLayout>
      </ErrorBoundary>
      <ToastContainer />
    </ToastProvider>
  );
}

// HomePage handles both Welcome and Chat views based on threadId query param
function HomePage() {
  const [searchParams] = useSearchParams();
  const { setCurrentThreadId } = useConversations();
  const threadId = searchParams.get('threadId');

  // Update context when URL changes
  useEffect(() => {
    setCurrentThreadId(threadId);
  }, [threadId, setCurrentThreadId]);

  return (
    <div className="w-full h-full flex flex-col">
      {threadId ? (
        <Chat key={threadId} threadId={threadId} />
      ) : (
        <Welcome/>
      )}
    </div>
  );
}

export default App;
