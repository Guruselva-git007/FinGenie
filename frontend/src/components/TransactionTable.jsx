import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';

import api from '../api/client';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatMonth(value) {
  return new Date(value).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
}

function formatShare(value) {
  return `${Math.round((value || 0) * 100)}%`;
}

function progressWidth(value) {
  const pct = Math.min(Math.max(Math.abs((value || 0) * 100), 8), 100);
  return `${pct}%`;
}

export default function TransactionTable({ transactions, trackRecord }) {
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [branches, setBranches] = useState([]);

  const deferredQuery = useDeferredValue(query);

  const categories = useMemo(
    () => [...new Set(transactions.map((tx) => tx.category).filter(Boolean))].sort(),
    [transactions]
  );

  useEffect(() => {
    let cancelled = false;

    const loadBranches = async () => {
      try {
        const response = await api.get('/profile/branches');
        if (!cancelled) {
          setBranches(response.data);
        }
      } catch {
        if (!cancelled) {
          setBranches([]);
        }
      }
    };

    loadBranches();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTransactions = useMemo(() => {
    const lowered = deferredQuery.trim().toLowerCase();

    return transactions.filter((tx) => {
      const matchesQuery = !lowered
        || tx.description.toLowerCase().includes(lowered)
        || (tx.merchant || '').toLowerCase().includes(lowered)
        || tx.category.toLowerCase().includes(lowered);

      const matchesKind = kindFilter === 'all' || tx.kind === kindFilter;
      const matchesCategory = categoryFilter === 'all' || tx.category === categoryFilter;

      return matchesQuery && matchesKind && matchesCategory;
    });
  }, [categoryFilter, deferredQuery, kindFilter, transactions]);

  const snapshot = trackRecord?.snapshot || null;
  const highestSpend = trackRecord?.highest_spend_categories || [];
  const lowestSpend = trackRecord?.lowest_spend_categories || [];
  const loanCommitments = trackRecord?.loan_commitments || [];
  const monthlyProgress = trackRecord?.monthly_progress || [];
  const branchMap = useMemo(
    () => Object.fromEntries(branches.map((branch) => [branch.id, branch.name])),
    [branches]
  );

  return (
    <div className="transaction-table-wrap section-stack">
      {trackRecord && (
        <section className="track-record-stack">
          <div className="panel-head">
            <div>
              <h3>Transaction Track Record</h3>
              <p className="muted">See where money goes most and least, track detected loan or EMI payments, and review monthly savings versus expenses in one place.</p>
            </div>
            <span className="chip chip-soft">{snapshot?.tracked_months ?? 0} months tracked</span>
          </div>

          <div className="track-record-overview">
            <div className="track-metric">
              <span className="muted">Highest spend area</span>
              <strong>{highestSpend[0]?.category || 'n/a'}</strong>
              <p>{currency.format(highestSpend[0]?.amount || 0)} • {formatShare(highestSpend[0]?.share_pct)}</p>
            </div>

            <div className="track-metric">
              <span className="muted">Lowest spend area</span>
              <strong>{lowestSpend[0]?.category || 'n/a'}</strong>
              <p>{currency.format(lowestSpend[0]?.amount || 0)} • {formatShare(lowestSpend[0]?.share_pct)}</p>
            </div>

            <div className="track-metric">
              <span className="muted">Estimated EMI load</span>
              <strong>{currency.format(snapshot?.estimated_monthly_emi || 0)}</strong>
              <p>{loanCommitments.length} detected loan / EMI lines</p>
            </div>

            <div className="track-metric">
              <span className="muted">Average monthly savings</span>
              <strong>{currency.format(snapshot?.average_monthly_savings || 0)}</strong>
              <p>Current month {currency.format(snapshot?.current_month_savings || 0)}</p>
            </div>
          </div>

          <div className="track-record-grid">
            <div className="track-card">
              <div className="panel-head">
                <div>
                  <h4>Most Spending</h4>
                </div>
              </div>
              {highestSpend.length === 0 && <p className="muted">No expense data yet.</p>}
              {highestSpend.map((item) => (
                <div className="track-line" key={`high-${item.category}`}>
                  <div>
                    <strong>{item.category}</strong>
                    <p className="muted">{formatShare(item.share_pct)} of all expenses</p>
                  </div>
                  <strong>{currency.format(item.amount)}</strong>
                </div>
              ))}
            </div>

            <div className="track-card">
              <div className="panel-head">
                <div>
                  <h4>Least Spending</h4>
                </div>
              </div>
              {lowestSpend.length === 0 && <p className="muted">No low-spend categories yet.</p>}
              {lowestSpend.map((item) => (
                <div className="track-line" key={`low-${item.category}`}>
                  <div>
                    <strong>{item.category}</strong>
                    <p className="muted">{formatShare(item.share_pct)} of all expenses</p>
                  </div>
                  <strong>{currency.format(item.amount)}</strong>
                </div>
              ))}
            </div>

            <div className="track-card">
              <div className="panel-head">
                <div>
                  <h4>Loans & EMIs</h4>
                </div>
              </div>
              {loanCommitments.length === 0 && <p className="muted">No loan or EMI-like payments detected in your transactions yet.</p>}
              {loanCommitments.map((item) => (
                <div className="track-line" key={item.label}>
                  <div>
                    <strong>{item.label}</strong>
                    <p className="muted">{item.payment_count} payments • latest {item.latest_payment_date ? formatDate(item.latest_payment_date) : 'n/a'}</p>
                  </div>
                  <div className="track-line-right">
                    <strong>{currency.format(item.monthly_average)}</strong>
                    <p className="muted">avg / month</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="track-card track-card-wide">
              <div className="panel-head">
                <div>
                  <h4>Monthly Savings vs Expenses</h4>
                  <p className="muted">Track progress month by month across income, expense, and savings flow.</p>
                </div>
              </div>

              {monthlyProgress.length === 0 && <p className="muted">No monthly track record yet.</p>}
              <div className="track-progress-list">
                {monthlyProgress.map((item) => (
                  <div className="track-progress-row" key={item.month}>
                    <div className="track-progress-head">
                      <div>
                        <strong>{formatMonth(item.month)}</strong>
                        <p className="muted">
                          Income {currency.format(item.income)} • Expense {currency.format(item.expense)}
                        </p>
                      </div>
                      <div className="track-progress-summary">
                        <strong className={item.savings >= 0 ? 'positive-text' : 'negative-text'}>
                          {currency.format(item.savings)}
                        </strong>
                        <span className={`status-pill ${item.savings >= 0 ? 'status-on_track' : 'status-critical'}`}>
                          {formatShare(item.savings_rate)}
                        </span>
                      </div>
                    </div>
                    <div className="track-progress-bar">
                      <span
                        className={item.savings >= 0 ? 'positive' : 'negative'}
                        style={{ width: progressWidth(item.savings_rate) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="panel-head">
        <div>
          <h3>Transaction Review Desk</h3>
          <p className="muted">Search, filter, and scan activity without losing the larger cashflow context.</p>
        </div>
        <span className="chip chip-soft">{filteredTransactions.length} rows</span>
      </div>

      <div className="table-toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search description, merchant, or category" />
        <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}>
          <option value="all">all types</option>
          <option value="expense">expense</option>
          <option value="income">income</option>
        </select>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="all">all categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        <table className="transaction-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Details</th>
              <th>Category</th>
              <th>Branch</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">No matching transactions.</td>
              </tr>
            )}
            {filteredTransactions.map((tx) => (
              <tr key={tx.id}>
                <td>{formatDate(tx.transaction_date)}</td>
                <td>
                  <strong>{tx.description}</strong>
                  <p className="muted">{tx.merchant || 'No merchant'}</p>
                </td>
                <td>{tx.category}</td>
                <td>{tx.branch_account_id ? (branchMap[tx.branch_account_id] || `Branch #${tx.branch_account_id}`) : 'Personal'}</td>
                <td>
                  <span className={`type-pill ${tx.kind}`}>{tx.kind}</span>
                </td>
                <td className={`amount-cell ${tx.kind}`}>{currency.format(tx.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
