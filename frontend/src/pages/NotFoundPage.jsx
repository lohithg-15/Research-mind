import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import AppShell from '../components/shell/AppShell';
import Button from '../components/ui/Button';
import './history.css';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <div className="rm-not-found">
        <div className="rm-not-found-card">
          <span className="rm-not-found-code">404</span>
          <h1>Page not found</h1>
          <p>The page you’re looking for doesn’t exist or has been moved.</p>
          <div className="rm-not-found-actions">
            <Button icon={<Home size={14} />} onClick={() => navigate('/')}>Go home</Button>
            <Button variant="secondary" icon={<ArrowLeft size={14} />} onClick={() => navigate(-1)}>Go back</Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
