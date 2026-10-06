import React, { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Modal } from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Tabs from './ui/Tabs';
import './AuthModal.css';

export default function AuthModal({ isOpen, onClose }) {
  const [mode, setMode] = useState('login');   // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const { login, register, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!email.trim() || !password.trim()) {
      setLocalError('Please fill in all fields.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
    }

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setLocalError('');
      onClose();
    } catch (err) {
      setLocalError(err.message || 'Something went wrong.');
    }
  };

  function switchMode(next) {
    setMode(next);
    setLocalError('');
    setConfirmPassword('');
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="rm-authmodal">
      <div className="rm-authmodal-header">
        <h2 className="rm-authmodal-title">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p className="rm-authmodal-subtitle">
          {mode === 'login'
            ? 'Sign in to access your research history'
            : 'Register to save and revisit your research'}
        </p>
      </div>

      <Tabs
        className="rm-authmodal-tabs"
        tabs={[
          { key: 'login', label: 'Sign in', Icon: LogIn },
          { key: 'register', label: 'Register', Icon: UserPlus },
        ]}
        activeKey={mode}
        onChange={switchMode}
      />

      {localError && (
        <div className="rm-authmodal-error" role="alert">
          <AlertCircle size={13} />
          {localError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rm-authmodal-form">
        <div className="rm-authmodal-field">
          <label className="rm-authmodal-label" htmlFor="authmodal-email">Email</label>
          <div className="rm-authmodal-input-wrap">
            <Mail size={14} className="rm-authmodal-input-icon" />
            <Input
              id="authmodal-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              autoComplete="email"
            />
          </div>
        </div>

        <div className="rm-authmodal-field">
          <label className="rm-authmodal-label" htmlFor="authmodal-password">Password</label>
          <div className="rm-authmodal-input-wrap">
            <Lock size={14} className="rm-authmodal-input-icon" />
            <Input
              id="authmodal-password"
              type="password"
              placeholder={mode === 'register' ? 'Min 6 characters' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
        </div>

        {mode === 'register' && (
          <div className="rm-authmodal-field">
            <label className="rm-authmodal-label" htmlFor="authmodal-confirm">Confirm password</label>
            <div className="rm-authmodal-input-wrap">
              <Lock size={14} className="rm-authmodal-input-icon" />
              <Input
                id="authmodal-confirm"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
        )}

        <Button type="submit" size="lg" loading={loading} icon={mode === 'login' ? <LogIn size={14} /> : <UserPlus size={14} />}>
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <p className="rm-authmodal-footer">
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <button type="button" className="rm-authmodal-link" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Register' : 'Sign in'}
        </button>
      </p>
    </Modal>
  );
}
