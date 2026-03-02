import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';

import api from './api/client';
import HomeOverview from './components/HomeOverview';
import TransactionForm from './components/TransactionForm';

const AssistantHub = lazy(() => import('./components/AssistantHub'));
const AutomationLab = lazy(() => import('./components/AutomationLab'));
const BudgetPanel = lazy(() => import('./components/BudgetPanel'));
const ChartsPanel = lazy(() => import('./components/ChartsPanel'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const TransactionTable = lazy(() => import('./components/TransactionTable'));

const sections = [
  { key: 'home', label: 'Home', icon: 'HM' },
  { key: 'analytics', label: 'Analytics', icon: 'AN' },
  { key: 'assistant', label: 'Assistant', icon: 'AI' },
  { key: 'automation', label: 'Automation', icon: 'ML' },
  { key: 'transactions', label: 'Transactions', icon: 'TX' },
  { key: 'settings', label: 'Settings', icon: 'ST' },
];

const CORE_SECTION_KEYS = new Set(['home', 'analytics', 'transactions']);

export default function App() {
  const [activeSection, setActiveSection] = useState('home');

  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [smartPlan, setSmartPlan] = useState(null);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

  const [submittingTx, setSubmittingTx] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [loadingCore, setLoadingCore] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [error, setError] = useState('');

  const health = summary?.financial_health;

  const sectionTitle = useMemo(
    () => sections.find((section) => section.key === activeSection)?.label || 'Home',
    [activeSection]
  );

  const refreshCore = useCallback(async () => {
    setLoadingCore(true);
    setError('');
    try {
      const [txRes, summaryRes] = await Promise.all([
        api.get('/transactions?limit=100'),
        api.get('/analytics/summary?forecast_months=4'),
      ]);
      setTransactions(txRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Unable to load FinGenie data.';
      setError(message);
    } finally {
      setLoadingCore(false);
    }
  }, []);

  const refreshAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    setError('');
    try {
      const [budgetRes, smartRes] = await Promise.all([
        api.get('/budgets'),
        api.get('/budgets/smart-plan'),
      ]);
      setBudgets(budgetRes.data);
      setSmartPlan(smartRes.data);
      setAnalyticsLoaded(true);
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Unable to load analytics modules.';
      setError(message);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    refreshCore();
  }, [refreshCore]);

  useEffect(() => {
    if (activeSection === 'analytics' && !analyticsLoaded && !loadingAnalytics) {
      refreshAnalytics();
    }
  }, [activeSection, analyticsLoaded, loadingAnalytics, refreshAnalytics]);

  const refreshVisibleData = useCallback(async () => {
    await Promise.all([
      refreshCore(),
      analyticsLoaded ? refreshAnalytics() : Promise.resolve(),
    ]);
  }, [analyticsLoaded, refreshAnalytics, refreshCore]);

  const submitTransaction = async (payload) => {
    setSubmittingTx(true);
    setError('');
    try {
      await api.post('/transactions', payload);
      await Promise.all([
        refreshCore(),
        analyticsLoaded ? refreshAnalytics() : Promise.resolve(),
      ]);
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Failed to add transaction.';
      setError(message);
    } finally {
      setSubmittingTx(false);
    }
  };

  const saveBudget = async (payload) => {
    setSavingBudget(true);
    setError('');
    try {
      await api.post('/budgets', payload);
      await Promise.all([
        refreshCore(),
        refreshAnalytics(),
      ]);
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Failed to save budget.';
      setError(message);
    } finally {
      setSavingBudget(false);
    }
  };

  const seedDemo = async () => {
    setError('');
    try {
      await api.post('/demo/seed');
      await Promise.all([
        refreshCore(),
        analyticsLoaded ? refreshAnalytics() : Promise.resolve(),
      ]);
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Unable to seed demo data.';
      setError(message);
    }
  };

  const reportError = (message) => {
    setError(message);
  };

  const sectionFallback = (
    <section className="panel">
      <h3>Loading section...</h3>
      <p className="muted">Optimizing and preparing this module.</p>
    </section>
  );

  const renderSection = () => {
    if (CORE_SECTION_KEYS.has(activeSection) && loadingCore) {
      return (
        <section className="panel">
          <h3>Loading...</h3>
          <p className="muted">Preparing your finance workspace.</p>
        </section>
      );
    }

    switch (activeSection) {
      case 'home':
        return (
          <HomeOverview
            summary={summary}
            health={health}
            transactions={transactions}
            onOpenSection={setActiveSection}
            quickTransactionForm={<TransactionForm onSubmit={submitTransaction} submitting={submittingTx} />}
          />
        );
      case 'analytics':
        if (!analyticsLoaded && loadingAnalytics) {
          return (
            <section className="panel">
              <h3>Preparing analytics...</h3>
              <p className="muted">Loading budgets, smart plans, and optimization modules.</p>
            </section>
          );
        }
        return (
          <Suspense fallback={sectionFallback}>
            <div className="section-stack">
              <section className="panel">
                <h3>Analytics Dashboard</h3>
                <ChartsPanel summary={summary} />
                {summary && (
                  <div className="insights">
                    <h4>Insights</h4>
                    <ul>
                      {summary.insights.map((insight) => (
                        <li key={insight}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
              <section className="panel">
                <BudgetPanel budgets={budgets} smartPlan={smartPlan} onSaveBudget={saveBudget} loading={savingBudget} />
              </section>
            </div>
          </Suspense>
        );
      case 'assistant':
        return (
          <Suspense fallback={sectionFallback}>
            <section className="panel">
              <AssistantHub onError={reportError} onDataMutation={refreshVisibleData} />
            </section>
          </Suspense>
        );
      case 'automation':
        return (
          <Suspense fallback={sectionFallback}>
            <section className="panel">
              <AutomationLab onError={reportError} />
            </section>
          </Suspense>
        );
      case 'transactions':
        return (
          <div className="section-stack">
            <section className="panel">
              <TransactionForm onSubmit={submitTransaction} submitting={submittingTx} />
            </section>
            <Suspense fallback={sectionFallback}>
              <section className="panel">
                <TransactionTable transactions={transactions} />
              </section>
            </Suspense>
          </div>
        );
      case 'settings':
        return (
          <Suspense fallback={sectionFallback}>
            <SettingsPage onError={reportError} />
          </Suspense>
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-shell sectioned-shell">
      <header className="topbar sectioned-topbar">
        <div>
          <p className="eyebrow">AI Powered Personal Finance Manager</p>
          <h1>FinGenie</h1>
        </div>
        <div className="header-actions">
          <button className="secondary" onClick={seedDemo}>Load Demo Data</button>
          <button className="secondary" onClick={refreshVisibleData}>Refresh</button>
        </div>
      </header>

      <section className="section-nav-wrap">
        <div className="section-nav-header">
          <h2>{sectionTitle}</h2>
          <p className="muted">Navigate using icon tabs to keep each feature focused and uncluttered.</p>
        </div>
        <nav className="section-nav" aria-label="App Sections">
          {sections.map((section) => (
            <button
              key={section.key}
              className={`section-tab ${activeSection === section.key ? 'active' : ''}`}
              onClick={() => setActiveSection(section.key)}
              aria-current={activeSection === section.key ? 'page' : undefined}
            >
              <span className="section-tab-icon">{section.icon}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </nav>
      </section>

      {error && <div className="error-banner">{error}</div>}

      <main className="section-main">{renderSection()}</main>
    </div>
  );
}
