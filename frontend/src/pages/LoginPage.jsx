import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Wordmark from '../components/ui/Wordmark';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import './AuthPage.css';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    try {
      await login(email.trim().toLowerCase(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed.');
    }
  };

  return (
    <div className="rm-auth-page">
      <aside className="rm-auth-panel">
        <Link to="/" className="rm-auth-panel-logo" aria-label="ResearchMind home">
          <Wordmark size={15} />
        </Link>
        <h2 className="rm-auth-panel-title">Welcome back.</h2>
        <p className="rm-auth-panel-desc">
          Sign in to pick up where you left off — your research history,
          reports and saved sessions are waiting.
        </p>
        <p className="rm-auth-panel-switch">
          New to ResearchMind? <Link to="/signup" className="rm-auth-link">Create an account</Link>
        </p>
      </aside>

      <main className="rm-auth-main">
        <Card className="rm-auth-card">
          <h1 className="rm-auth-card-title">Sign in</h1>
          <p className="rm-auth-card-subtitle">Sign in to access your research history</p>

          {error && (
            <div className="rm-auth-error" role="alert">
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="rm-auth-form">
            <div className="rm-auth-field">
              <label className="rm-auth-label" htmlFor="login-email">Email</label>
              <div className="rm-auth-input-wrap">
                <Mail size={14} className="rm-auth-input-icon" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="rm-auth-field">
              <label className="rm-auth-label" htmlFor="login-password">Password</label>
              <div className="rm-auth-input-wrap">
                <Lock size={14} className="rm-auth-input-icon" />
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button type="submit" size="lg" loading={loading} icon={<LogIn size={14} />} id="login-submit-btn">
              Sign in
            </Button>
          </form>

          <p className="rm-auth-footer">
            Don't have an account?{' '}
            <Link to="/signup" className="rm-auth-link">Register</Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
