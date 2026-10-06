import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Wordmark from '../components/ui/Wordmark';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import './AuthPage.css';

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
    <div className="rm-auth-page">
      <aside className="rm-auth-panel">
        <Link to="/" className="rm-auth-panel-logo" aria-label="ResearchMind home">
          <Wordmark size={15} />
        </Link>
        <h2 className="rm-auth-panel-title">Start for free.</h2>
        <p className="rm-auth-panel-desc">
          Create an account to save your research sessions, revisit reports,
          and pick up any literature review where you left off.
        </p>
        <p className="rm-auth-panel-switch">
          Already have an account? <Link to="/login" className="rm-auth-link">Sign in</Link>
        </p>
      </aside>

      <main className="rm-auth-main">
        <Card className="rm-auth-card">
          <h1 className="rm-auth-card-title">Create account</h1>
          <p className="rm-auth-card-subtitle">Register to save and revisit your research</p>

          {error && (
            <div className="rm-auth-error" role="alert">
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="rm-auth-form">
            <div className="rm-auth-field">
              <label className="rm-auth-label" htmlFor="signup-email">Email</label>
              <div className="rm-auth-input-wrap">
                <Mail size={14} className="rm-auth-input-icon" />
                <Input
                  id="signup-email"
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
              <label className="rm-auth-label" htmlFor="signup-password">Password</label>
              <div className="rm-auth-input-wrap">
                <Lock size={14} className="rm-auth-input-icon" />
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="rm-auth-field">
              <label className="rm-auth-label" htmlFor="signup-confirm">Confirm password</label>
              <div className="rm-auth-input-wrap">
                <Lock size={14} className="rm-auth-input-icon" />
                <Input
                  id="signup-confirm"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <Button type="submit" size="lg" loading={loading} icon={<UserPlus size={14} />} id="signup-submit-btn">
              Create account
            </Button>
          </form>

          <p className="rm-auth-terms">
            By continuing you agree to our Terms of Service and Privacy Policy.
          </p>

          <p className="rm-auth-footer">
            Already have an account?{' '}
            <Link to="/login" className="rm-auth-link">Sign in</Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
