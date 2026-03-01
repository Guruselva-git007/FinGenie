import React from 'react';

import StatCard from './StatCard';

const sectionCards = [
  { key: 'analytics', icon: 'AN', title: 'Analytics', subtitle: 'Spending trends and insights' },
  { key: 'assistant', icon: 'AI', title: 'Genie Assistant', subtitle: 'Automation and smart help' },
  { key: 'automation', icon: 'ML', title: 'Automation Lab', subtitle: 'Advanced calculators and models' },
  { key: 'transactions', icon: 'TX', title: 'Transactions', subtitle: 'Track and review cashflow' },
  { key: 'settings', icon: 'ST', title: 'Settings', subtitle: 'Personal and account details' },
];

export default function HomeOverview({ summary, health, onOpenSection, quickTransactionForm, transactions }) {
  const latestTransactions = transactions.slice(0, 5);

  return (
    <div className="home-overview">
      {summary && (
        <section className="stats-row compact">
          <StatCard label="Income" value={summary.income_total} tone="positive" />
          <StatCard label="Expenses" value={summary.expense_total} tone="negative" />
          <StatCard label="Net Cashflow" value={summary.net_cashflow} tone={summary.net_cashflow >= 0 ? 'positive' : 'negative'} />
          <div className="stat-card tone-neutral">
            <p className="stat-label">Health Score</p>
            <h3 className="stat-value">{health?.score ?? 0}/100</h3>
            <p className="muted">{health?.status ?? 'Unknown'}</p>
          </div>
        </section>
      )}

      <section className="home-grid">
        <div className="panel">
          <h3>Quick Add</h3>
          {quickTransactionForm}
        </div>

        <div className="panel">
          <h3>Important Insights</h3>
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
              <strong>{summary?.spending_forecast?.[0]?.predicted_spending?.toFixed?.(0) || 0}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>Explore Sections</h3>
        <p className="muted">Use these icon cards to jump to focused pages without long scrolling.</p>
        <div className="section-card-grid">
          {sectionCards.map((section) => (
            <button key={section.key} className="section-card" onClick={() => onOpenSection(section.key)}>
              <span className="section-icon">{section.icon}</span>
              <span className="section-title">{section.title}</span>
              <span className="section-subtitle">{section.subtitle}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>Recent Activity</h3>
        {latestTransactions.length === 0 && <p className="muted">No transactions yet.</p>}
        {latestTransactions.map((tx) => (
          <div className="activity-row" key={tx.id}>
            <div>
              <strong>{tx.description}</strong>
              <p className="muted">{tx.transaction_date} | {tx.category}</p>
            </div>
            <strong className={tx.kind === 'expense' ? 'negative-text' : 'positive-text'}>{tx.amount}</strong>
          </div>
        ))}
      </section>
    </div>
  );
}
