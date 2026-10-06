import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import AppShell from '../components/shell/AppShell';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <main className="rm-not-found">
        <div className="rm-not-found-card">
          <span className="not-found-code">404</span>
          <h1 className="not-found-title">Page not found</h1>
          <p className="not-found-desc">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="not-found-actions">
            <button className="rm-btn rm-btn-primary rm-btn-md" onClick={() => navigate('/')}>
              <Home size={14} />
              Go Home
            </button>
            <button className="rm-btn rm-btn-secondary rm-btn-md" onClick={() => navigate(-1)}>
              <ArrowLeft size={14} />
              Go Back
            </button>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
