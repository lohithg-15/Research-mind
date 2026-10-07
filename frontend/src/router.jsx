import React from 'react';
import {
  BrowserRouter, Routes, Route, Navigate,
} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ResearchProvider } from './context/ResearchContext';
import { ToastProvider } from './components/ui/Toast';

import LandingPage       from './pages/LandingPage';
import LoginPage         from './pages/LoginPage';
import SignupPage        from './pages/SignupPage';
import NewResearchPage   from './pages/NewResearchPage';
import ProgressPage      from './pages/ProgressPage';
import WorkspacePage     from './pages/WorkspacePage';
import PaperDetailPage   from './pages/PaperDetailPage';
import HistoryPage       from './pages/HistoryPage';
import NotFoundPage      from './pages/NotFoundPage';
import ProtectedRoute    from './components/ProtectedRoute';

/* AuthProvider must wrap ResearchProvider since ResearchProvider uses useAuth */
export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ResearchProvider>
          <ToastProvider>
          <Routes>
            <Route path="/"                               element={<LandingPage />} />
            <Route path="/login"                          element={<LoginPage />} />
            <Route path="/signup"                         element={<SignupPage />} />
            <Route path="/research/new"                   element={<NewResearchPage />} />
            <Route path="/research/:jobId/progress"       element={<ProgressPage />} />
            {/* Paper detail must come before the :tab wildcard */}
            <Route path="/research/:jobId/paper/:paperId" element={<PaperDetailPage />} />
            <Route path="/research/:jobId/:tab"           element={<WorkspacePage />} />
            <Route path="/research/:jobId"                element={<Navigate to="papers" replace />} />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </ToastProvider>
        </ResearchProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
