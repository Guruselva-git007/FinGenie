import React, { useEffect, useState } from 'react';

import api from '../api/client';

export default function SettingsPage({ onError }) {
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [profileRes, prefRes] = await Promise.all([
        api.get('/assistant/profile'),
        api.get('/assistant/preferences'),
      ]);
      setProfile(profileRes.data);
      setPreferences(prefRes.data);
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Failed to load settings.';
      onError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    try {
      const response = await api.put('/assistant/profile', {
        ...profile,
        monthly_income_goal: Number(profile.monthly_income_goal),
        annual_income_goal: Number(profile.annual_income_goal),
      });
      setProfile(response.data);
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Failed to save profile.';
      onError(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePreferences = async (event) => {
    event.preventDefault();
    if (!preferences) return;
    setSavingPreferences(true);
    try {
      const response = await api.put('/assistant/preferences', {
        ...preferences,
        monthly_savings_target: Number(preferences.monthly_savings_target),
      });
      setPreferences(response.data);
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Failed to save preferences.';
      onError(message);
    } finally {
      setSavingPreferences(false);
    }
  };

  if (loading) {
    return (
      <section className="panel">
        <h3>Settings</h3>
        <p className="muted">Loading account settings...</p>
      </section>
    );
  }

  return (
    <div className="settings-grid">
      <section className="panel">
        <h3>Personal Info</h3>
        {profile && (
          <form className="settings-form" onSubmit={saveProfile}>
            <div className="two-col">
              <label>
                Full Name
                <input value={profile.full_name} onChange={(e) => setProfile((prev) => ({ ...prev, full_name: e.target.value }))} required />
              </label>
              <label>
                Email
                <input type="email" value={profile.email} onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))} required />
              </label>
            </div>

            <div className="two-col">
              <label>
                Phone
                <input value={profile.phone} onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))} />
              </label>
              <label>
                Occupation
                <input value={profile.occupation} onChange={(e) => setProfile((prev) => ({ ...prev, occupation: e.target.value }))} />
              </label>
            </div>

            <div className="two-col">
              <label>
                Country
                <input value={profile.country} onChange={(e) => setProfile((prev) => ({ ...prev, country: e.target.value }))} />
              </label>
              <label>
                City
                <input value={profile.city} onChange={(e) => setProfile((prev) => ({ ...prev, city: e.target.value }))} />
              </label>
            </div>

            <div className="two-col">
              <label>
                Timezone
                <input value={profile.timezone} onChange={(e) => setProfile((prev) => ({ ...prev, timezone: e.target.value }))} />
              </label>
              <label>
                Language
                <input value={profile.language} onChange={(e) => setProfile((prev) => ({ ...prev, language: e.target.value }))} />
              </label>
            </div>

            <div className="two-col">
              <label>
                Monthly Income Goal
                <input type="number" min="0" step="0.01" value={profile.monthly_income_goal} onChange={(e) => setProfile((prev) => ({ ...prev, monthly_income_goal: e.target.value }))} />
              </label>
              <label>
                Annual Income Goal
                <input type="number" min="0" step="0.01" value={profile.annual_income_goal} onChange={(e) => setProfile((prev) => ({ ...prev, annual_income_goal: e.target.value }))} />
              </label>
            </div>

            <button type="submit" disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save Personal Info'}</button>
          </form>
        )}
      </section>

      <section className="panel">
        <h3>Account Details</h3>
        {profile && (
          <form className="settings-form" onSubmit={saveProfile}>
            <div className="two-col">
              <label>
                Username
                <input value={profile.username} onChange={(e) => setProfile((prev) => ({ ...prev, username: e.target.value }))} />
              </label>
              <label>
                Account Tier
                <select value={profile.account_tier} onChange={(e) => setProfile((prev) => ({ ...prev, account_tier: e.target.value }))}>
                  <option value="free">free</option>
                  <option value="pro">pro</option>
                  <option value="premium">premium</option>
                </select>
              </label>
            </div>

            <label className="inline-check">
              <input type="checkbox" checked={profile.two_factor_enabled} onChange={(e) => setProfile((prev) => ({ ...prev, two_factor_enabled: e.target.checked }))} />
              Enable two-factor authentication
            </label>

            <label className="inline-check">
              <input type="checkbox" checked={profile.marketing_opt_in} onChange={(e) => setProfile((prev) => ({ ...prev, marketing_opt_in: e.target.checked }))} />
              Receive product updates and feature announcements
            </label>

            <button type="submit" disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save Account Details'}</button>
          </form>
        )}
      </section>

      <section className="panel span-2">
        <h3>App Preferences</h3>
        {preferences && (
          <form className="settings-form" onSubmit={savePreferences}>
            <div className="two-col">
              <label>
                Currency
                <input value={preferences.currency} onChange={(e) => setPreferences((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} />
              </label>
              <label>
                Savings Target
                <input type="number" min="0" step="0.01" value={preferences.monthly_savings_target} onChange={(e) => setPreferences((prev) => ({ ...prev, monthly_savings_target: e.target.value }))} />
              </label>
            </div>

            <div className="two-col">
              <label>
                Risk Profile
                <select value={preferences.risk_profile} onChange={(e) => setPreferences((prev) => ({ ...prev, risk_profile: e.target.value }))}>
                  <option value="conservative">conservative</option>
                  <option value="balanced">balanced</option>
                  <option value="aggressive">aggressive</option>
                </select>
              </label>
              <label>
                Theme
                <select value={preferences.theme} onChange={(e) => setPreferences((prev) => ({ ...prev, theme: e.target.value }))}>
                  <option value="minimal-light">minimal-light</option>
                  <option value="classic-light">classic-light</option>
                  <option value="calm-light">calm-light</option>
                </select>
              </label>
            </div>

            <label className="inline-check">
              <input type="checkbox" checked={preferences.notifications_enabled} onChange={(e) => setPreferences((prev) => ({ ...prev, notifications_enabled: e.target.checked }))} />
              Enable proactive alerts
            </label>

            <button type="submit" disabled={savingPreferences}>{savingPreferences ? 'Saving...' : 'Save Preferences'}</button>
          </form>
        )}
      </section>
    </div>
  );
}
