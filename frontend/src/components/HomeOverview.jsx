import React from 'react';

import StatCard from './StatCard';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const sectionCards = [
  { key: 'plan', icon: 'PL', title: 'Planner' },
  { key: 'intelligence', icon: 'IN', title: 'Intelligence' },
  { key: 'assistant', icon: 'AI', title: 'Assistant' },
  { key: 'transactions', icon: 'TX', title: 'Transactions' },
  { key: 'profile', icon: 'PR', title: 'Profile' },
  { key: 'settings', icon: 'ST', title: 'Settings' },
];

export default function HomeOverview({
  summary,
  health,
  transactions,
  goals,
  goalsSummary,
  netWorth,
  billCalendar,
  subscriptionOpportunities,
  onOpenSection,
  quickTransactionForm,
}) {
  const latestTransactions = transactions.slice(0, 6);
  const topGoals = goals.slice(0, 3);
  const netWorthValue = netWorth?.summary?.net_worth || 0;

  return (
    <div className="home-overview">
      {summary && (
        <section className="stats-row compact">
          <StatCard label="Income" value={summary.income_total} tone="positive" />
          <StatCard label="Expenses" value={summary.expense_total} tone="negative" />
          <StatCard label="Net Cashflow" value={summary.net_cashflow} tone={summary.net_cashflow >= 0 ? 'positive' : 'negative'} />
          <div className="stat-card tone-neutral">
            <p className="stat-label">Health</p>
            <h3 className="stat-value">{health?.score ?? 0}/100</h3>
            <p className="muted">{health?.status ?? 'Unknown'}</p>
          </div>
          <StatCard label="Net Worth" value={netWorthValue} tone={netWorthValue >= 0 ? 'positive' : 'negative'} />
          <div className="stat-card tone-neutral">
            <p className="stat-label">Goals</p>
            <h3 className="stat-value">{goalsSummary?.completion_pct ?? 0}%</h3>
            <p className="muted">{goalsSummary?.active_goals ?? 0} active goals</p>
          </div>
        </section>
      )}

      <section className="home-hero-grid minimal-overview-grid">
        <div className="panel">
          <div className="panel-head">
            <h3>Quick Add</h3>
            <button type="button" className="ghost" onClick={() => onOpenSection('transactions')}>Open</button>
          </div>
          {quickTransactionForm}
        </div>

        <div className="panel">
          <h3>Today</h3>

          <div className="home-focus-stack">
            <div className="focus-row">
              <div>
                <strong>Bills</strong>
                <p className="muted">{billCalendar.length} upcoming</p>
              </div>
              <button type="button" className="secondary" onClick={() => onOpenSection('plan')}>Planner</button>
            </div>
            <div className="focus-row">
              <div>
                <strong>Subscriptions</strong>
                <p className="muted">{subscriptionOpportunities.length} flagged</p>
              </div>
              <button type="button" className="secondary" onClick={() => onOpenSection('intelligence')}>Review</button>
            </div>
            <div className="focus-row">
              <div>
                <strong>Goals</strong>
                <p className="muted">{goalsSummary?.on_track_goals ?? 0} on track</p>
              </div>
              <button type="button" className="secondary" onClick={() => onOpenSection('plan')}>Open</button>
            </div>
          </div>
        </div>
      </section>

      <section className="home-grid">
        <div className="panel">
          <h3>Goals</h3>
          {topGoals.length === 0 && <p className="muted">No goals yet.</p>}
          {topGoals.map((goal) => (
            <div className="goal-snapshot" key={goal.id}>
              <div className="goal-progress-meta">
                <div>
                  <strong>{goal.title}</strong>
                  <p className="muted">{goal.target_date || 'No target date'} • {goal.pace_status.replace('_', ' ')}</p>
                </div>
                <strong>{goal.progress_pct}%</strong>
              </div>
              <div className="progress-track">
                <span style={{ width: `${Math.min(goal.progress_pct, 100)}%` }} />
              </div>
              <div className="goal-mini-grid">
                <div className="kpi-box">
                  <p className="muted">Saved</p>
                  <strong>{currency.format(goal.current_amount)}</strong>
                </div>
                <div className="kpi-box">
                  <p className="muted">Remaining</p>
                  <strong>{currency.format(goal.remaining_amount)}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="panel">
          <h3>Insights</h3>
          <ul className="insight-list">
            {(summary?.insights || []).slice(0, 4).map((insight) => (
              <li key={insight}>{insight}</li>
            ))}
          </ul>
          {!summary?.insights?.length && <p className="muted">Add transactions to generate insights.</p>}

          <div className="home-kpi-grid">
            <div className="kpi-box">
              <p className="muted">Top Category</p>
              <strong>{summary?.expense_by_category?.[0]?.category || 'n/a'}</strong>
            </div>
            <div className="kpi-box">
              <p className="muted">Forecast Next Month</p>
              <strong>{currency.format(summary?.spending_forecast?.[0]?.predicted_spending || 0)}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="section-card-grid compact-links">
        {sectionCards.map((section) => (
          <button key={section.key} className="section-card compact-link" onClick={() => onOpenSection(section.key)}>
            <span className="section-icon">{section.icon}</span>
            <span className="section-title">{section.title}</span>
          </button>
        ))}
      </div>

      <section className="panel">
        <h3>Recent Activity</h3>
        {latestTransactions.length === 0 && <p className="muted">No transactions yet.</p>}
        {latestTransactions.map((tx) => (
          <div className="activity-row" key={tx.id}>
            <div>
              <strong>{tx.description}</strong>
              <p className="muted">{tx.transaction_date} • {tx.category}</p>
            </div>
            <strong className={tx.kind === 'expense' ? 'negative-text' : 'positive-text'}>{currency.format(tx.amount)}</strong>
          </div>
        ))}
      </section>
    </div>
  );
}
