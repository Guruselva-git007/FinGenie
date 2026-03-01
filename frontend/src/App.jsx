import React, { useEffect, useState } from 'react';

import api from './api/client';
import AssistantHub from './components/AssistantHub';
import AutomationLab from './components/AutomationLab';
import BudgetPanel from './components/BudgetPanel';
import ChartsPanel from './components/ChartsPanel';
import StatCard from './components/StatCard';
import TransactionForm from './components/TransactionForm';
import TransactionTable from './components/TransactionTable';

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [smartPlan, setSmartPlan] = useState(null);

  const [submittingTx, setSubmittingTx] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const health = summary?.financial_health;

  const reportError = (message) => {
    setError(message);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">AI Powered Personal Finance Manager</p>
          <h1>FinGenie</h1>
        </div>
        <div className="header-actions">
          <button className="secondary" onClick={seedDemo}>Load Demo Data</button>
          <button className="secondary" onClick={refreshAll}>Refresh</button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {summary && (
        <section className="stats-row">
          <StatCard label="Total Income" value={summary.income_total} tone="positive" />
          <StatCard label="Total Expenses" value={summary.expense_total} tone="negative" />
          <StatCard label="Net Cashflow" value={summary.net_cashflow} tone={summary.net_cashflow >= 0 ? 'positive' : 'negative'} />
          <div className="stat-card tone-neutral">
            <p className="stat-label">Financial Health Score</p>
            <h3 className="stat-value">{health?.score ?? 0}/100</h3>
            <p className="muted">{health?.status ?? 'Unknown'}</p>
          </div>
        </section>
      )}

      <main className="main-grid">
        <section className="panel">
          <TransactionForm onSubmit={submitTransaction} submitting={submittingTx} />
        </section>

        <section className="panel">
          <BudgetPanel budgets={budgets} smartPlan={smartPlan} onSaveBudget={saveBudget} loading={savingBudget} />
        </section>

        <section className="panel span-2">
          <h3>Analytics Dashboard</h3>
          {loading ? <p className="muted">Loading analytics...</p> : <ChartsPanel summary={summary} />}
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
          <AssistantHub onError={reportError} onDataMutation={refreshAll} />
        </section>

        <section className="panel span-2">
          <AutomationLab onError={reportError} />
        </section>

        <section className="panel span-2">
          <TransactionTable transactions={transactions} />
        </section>
      </main>
    </div>
  );
}
