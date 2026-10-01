import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, Mail, Lock, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    try {
      await register(email.trim().toLowerCase(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed.');
    }
  };

  return (
    <div className="auth-page">
      <Link to="/" className="auth-page-logo">
        <div className="navbar-logo-icon">
          <BookOpen size={15} color="#fff" />
        </div>
        <span className="navbar-brand">ResearchMind</span>
      </Link>

      <div className="auth-card">
        <h1 className="auth-card-title">Create account</h1>
        <p className="auth-card-subtitle">Register to save and revisit your research</p>

        {error && (
          <div className="auth-error" role="alert">
            <AlertCircle size={13} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label" htmlFor="signup-email">Email</label>
            <div className="auth-input-wrap">
              <Mail size={14} className="auth-input-icon" />
              <input
                id="signup-email"
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
            <label className="auth-label" htmlFor="signup-password">Password</label>
            <div className="auth-input-wrap">
              <Lock size={14} className="auth-input-icon" />
              <input
                id="signup-password"
                type="password"
                className="auth-input"
                placeholder="Min 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="signup-confirm">Confirm Password</label>
            <div className="auth-input-wrap">
              <Lock size={14} className="auth-input-icon" />
              <input
                id="signup-confirm"
                type="password"
                className="auth-input"
                placeholder="Re-enter password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading} id="signup-submit-btn">
            {loading
              ? <><Loader2 size={14} className="spin" /> Creating account…</>
              : <><UserPlus size={14} /> Create Account</>
            }
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
