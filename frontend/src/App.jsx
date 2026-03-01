import React, { useEffect, useMemo, useState } from 'react';

import api from './api/client';
import AssistantHub from './components/AssistantHub';
import AutomationLab from './components/AutomationLab';
import BudgetPanel from './components/BudgetPanel';
import ChartsPanel from './components/ChartsPanel';
import HomeOverview from './components/HomeOverview';
import SettingsPage from './components/SettingsPage';
import TransactionForm from './components/TransactionForm';
import TransactionTable from './components/TransactionTable';

const sections = [
  { key: 'home', label: 'Home', icon: 'HM' },
  { key: 'analytics', label: 'Analytics', icon: 'AN' },
  { key: 'assistant', label: 'Assistant', icon: 'AI' },
  { key: 'automation', label: 'Automation', icon: 'ML' },
  { key: 'transactions', label: 'Transactions', icon: 'TX' },
  { key: 'settings', label: 'Settings', icon: 'ST' },
];

export default function App() {
  const [activeSection, setActiveSection] = useState('home');

  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [smartPlan, setSmartPlan] = useState(null);

  const [submittingTx, setSubmittingTx] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const health = summary?.financial_health;

  const sectionTitle = useMemo(
    () => sections.find((section) => section.key === activeSection)?.label || 'Home',
    [activeSection]
  );

  const refreshAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [txRes, budgetRes, summaryRes, smartRes] = await Promise.all([
        api.get('/transactions?limit=100'),
        api.get('/budgets'),
        api.get('/analytics/summary?forecast_months=4'),
        api.get('/budgets/smart-plan'),
      ]);
      setTransactions(txRes.data);
      setBudgets(budgetRes.data);
      setSummary(summaryRes.data);
      setSmartPlan(smartRes.data);
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Unable to load FinGenie data.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const submitTransaction = async (payload) => {
    setSubmittingTx(true);
    setError('');
    try {
      await api.post('/transactions', payload);
      await refreshAll();
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
      await refreshAll();
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
      await refreshAll();
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Unable to seed demo data.';
      setError(message);
    }
  };

  const reportError = (message) => {
    setError(message);
  };

  const renderSection = () => {
    if (loading && activeSection !== 'settings') {
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
        return (
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
        );
      case 'assistant':
        return (
          <section className="panel">
            <AssistantHub onError={reportError} onDataMutation={refreshAll} />
          </section>
        );
      case 'automation':
        return (
          <section className="panel">
            <AutomationLab onError={reportError} />
          </section>
        );
      case 'transactions':
        return (
          <div className="section-stack">
            <section className="panel">
              <TransactionForm onSubmit={submitTransaction} submitting={submittingTx} />
            </section>
            <section className="panel">
              <TransactionTable transactions={transactions} />
            </section>
          </div>
        );
      case 'settings':
        return <SettingsPage onError={reportError} />;
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
          <button className="secondary" onClick={refreshAll}>Refresh</button>
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
