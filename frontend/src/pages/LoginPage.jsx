import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { BookOpen, Mail, Lock, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
    <div className="auth-page">
      {/* Logo */}
      <Link to="/" className="auth-page-logo">
        <div className="navbar-logo-icon">
          <BookOpen size={15} color="#fff" />
        </div>
        <span className="navbar-brand">ResearchMind</span>
      </Link>

      <div className="auth-card">
        <h1 className="auth-card-title">Welcome back</h1>
        <p className="auth-card-subtitle">Sign in to access your research history</p>

        {error && (
          <div className="auth-error" role="alert">
            <AlertCircle size={13} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-email">Email</label>
            <div className="auth-input-wrap">
              <Mail size={14} className="auth-input-icon" />
              <input
                id="login-email"
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="login-password">Password</label>
            <div className="auth-input-wrap">
              <Lock size={14} className="auth-input-icon" />
              <input
                id="login-password"
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading} id="login-submit-btn">
            {loading
              ? <><Loader2 size={14} className="spin" /> Signing in…</>
              : <><LogIn size={14} /> Sign In</>
            }
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup" className="auth-link">Register</Link>
        </p>
      </div>
    </div>
  );
}
