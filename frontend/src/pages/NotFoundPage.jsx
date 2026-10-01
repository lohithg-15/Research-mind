import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="page-shell">
      <Navbar />
      <main className="not-found-main">
        <div className="not-found-content">
          <span className="not-found-code">404</span>
          <h1 className="not-found-title">Page not found</h1>
          <p className="not-found-desc">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="not-found-actions">
            <button className="btn-primary" onClick={() => navigate('/')}>
              <Home size={14} />
              Go Home
            </button>
            <button className="btn-secondary" onClick={() => navigate(-1)}>
              <ArrowLeft size={14} />
              Go Back
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
