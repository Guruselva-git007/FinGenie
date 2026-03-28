import React, { useState } from 'react';

import api from '../api/client';

const benefitPoints = [
  'Create a real account with a JWT-backed session and isolated data.',
  'Enter as guest when you want a fast sandbox without permanent setup.',
  'Use branch-tagged transactions to power profile comparisons and reports.',
];

function toSession(responseData) {
  return {
    accessToken: responseData.access_token,
    userId: responseData.user.id,
    mode: responseData.user.is_guest ? 'guest' : 'member',
    fullName: responseData.user.full_name,
    email: responseData.user.email,
    username: responseData.user.username,
    enteredAt: new Date().toISOString(),
  };
}

export default function LoginPage({ onAccessGranted, error }) {
  const [mode, setMode] = useState('register');
  const [fullName, setFullName] = useState('FinGenie User');
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('demo1234');
  const [guestName, setGuestName] = useState('Guest User');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const submitRegister = async (event) => {
    event.preventDefault();
    setLoading(true);
    setLocalError('');
    try {
      const response = await api.post('/auth/register', {
        full_name: fullName,
        email,
        password,
      });
      onAccessGranted(toSession(response.data));
    } catch (err) {
      setLocalError(err?.response?.data?.detail || err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setLocalError('');
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });
      onAccessGranted(toSession(response.data));
    } catch (err) {
      setLocalError(err?.response?.data?.detail || err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const enterGuestMode = async () => {
    setLoading(true);
    setLocalError('');
    try {
      const response = await api.post('/auth/guest', { full_name: guestName });
      onAccessGranted(toSession(response.data));
    } catch (err) {
      setLocalError(err?.response?.data?.detail || err.message || 'Guest access failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <section className="login-panel panel">
        <div className="login-hero">
          <div>
            <p className="eyebrow">FinGenie Access</p>
            <h1>Secure sign-in, guest mode, and isolated workspaces.</h1>
            <p className="topbar-copy">Enter with a real account or jump in as guest. Your records, reports, branches, and settings now live behind an authenticated session.</p>
          </div>

          <div className="hero-tags">
            <span className="chip">JWT auth</span>
            <span className="chip chip-soft">Guest mode</span>
            <span className="chip chip-soft">Per-user data</span>
          </div>
        </div>

        <div className="login-grid">
          <section className="panel login-card">
            <div className="tab-row" role="tablist" aria-label="Access mode">
              <button type="button" className={`tab-chip ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>
                Create Account
              </button>
              <button type="button" className={`tab-chip ${mode === 'signin' ? 'active' : ''}`} onClick={() => setMode('signin')}>
                Sign In
              </button>
              <button type="button" className={`tab-chip ${mode === 'guest' ? 'active' : ''}`} onClick={() => setMode('guest')}>
                Guest Mode
              </button>
            </div>

            {mode === 'register' && (
              <form className="settings-form" onSubmit={submitRegister}>
                <label>
                  Full Name
                  <input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
                </label>
                <label>
                  Email
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </label>
                <label>
                  Password
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={4} required />
                </label>
                <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
              </form>
            )}

            {mode === 'signin' && (
              <form className="settings-form" onSubmit={submitLogin}>
                <label>
                  Email
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </label>
                <label>
                  Password
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={4} required />
                </label>
                <button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
              </form>
            )}

            {mode === 'guest' && (
              <div className="guest-card">
                <label>
                  Guest Name
                  <input value={guestName} onChange={(event) => setGuestName(event.target.value)} />
                </label>
                <p className="muted">Guest mode creates a temporary authenticated workspace so you can still use reports, profile comparison, and branch-tagged transactions.</p>
                <button type="button" onClick={enterGuestMode} disabled={loading}>{loading ? 'Entering...' : 'Continue as Guest'}</button>
              </div>
            )}

            {(localError || error) && <div className="error-banner">{localError || error}</div>}
          </section>

          <section className="panel login-card">
            <h3>What This Upgrade Adds</h3>
            <div className="home-focus-stack">
              {benefitPoints.map((point) => (
                <div key={point} className="focus-row">
                  <div>
                    <strong>Access benefit</strong>
                    <p className="muted">{point}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
