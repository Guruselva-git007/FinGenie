import React, { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const emptyAccountForm = {
  name: '',
  account_type: 'asset',
  category: 'cash',
  balance: '',
  institution: '',
  notes: '',
};

function formatChartDate(value) {
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function NetWorthTracker({ netWorth, onCreateAccount, onUpdateAccount, onDeleteAccount, saving }) {
  const [form, setForm] = useState(emptyAccountForm);
  const [drafts, setDrafts] = useState({});

  const accounts = netWorth?.accounts || [];
  const summary = netWorth?.summary || {
    total_assets: 0,
    total_liabilities: 0,
    net_worth: 0,
    asset_breakdown: [],
    liability_breakdown: [],
    snapshot_history: [],
  };

  useEffect(() => {
    setDrafts((prev) => {
      const next = {};
      accounts.forEach((account) => {
        next[account.id] = prev[account.id] || {
          balance: String(account.balance ?? ''),
          category: account.category,
        };
      });
      return next;
    });
  }, [accounts]);

  const submitAccount = async (event) => {
    event.preventDefault();
    if (!form.name || !form.balance) return;

    await onCreateAccount({
      ...form,
      balance: Number(form.balance),
      institution: form.institution || null,
      notes: form.notes || null,
    });

    setForm(emptyAccountForm);
  };

  const updateDraft = (accountId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        [field]: value,
      },
    }));
  };

  const saveAccount = async (accountId) => {
    const draft = drafts[accountId];
    if (!draft) return;

    await onUpdateAccount(accountId, {
      balance: Number(draft.balance || 0),
      category: draft.category,
    });
  };

  return (
    <div className="networth-tracker">
      <div className="panel-head">
        <div>
          <h3>Net Worth</h3>
        </div>
        <div className="planner-banner-metrics">
          <div className="planner-mini-stat">
            <span className="muted">Assets</span>
            <strong>{currency.format(summary.total_assets || 0)}</strong>
          </div>
          <div className="planner-mini-stat">
            <span className="muted">Debt</span>
            <strong>{currency.format(summary.total_liabilities || 0)}</strong>
          </div>
          <div className="planner-mini-stat">
            <span className="muted">Net worth</span>
            <strong>{currency.format(summary.net_worth || 0)}</strong>
          </div>
        </div>
      </div>

      <div className="networth-layout">
        <form className="goal-form" onSubmit={submitAccount}>
          <label>
            Account name
            <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Emergency fund, HDFC card, SIP portfolio..." required />
          </label>
          <div className="two-col">
            <label>
              Type
              <select value={form.account_type} onChange={(event) => setForm((prev) => ({ ...prev, account_type: event.target.value }))}>
                <option value="asset">asset</option>
                <option value="debt">debt</option>
              </select>
            </label>
            <label>
              Category
              <input value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} placeholder="cash, investments, property, loan..." />
            </label>
          </div>
          <div className="two-col">
            <label>
              Balance
              <input type="number" min="0" step="0.01" value={form.balance} onChange={(event) => setForm((prev) => ({ ...prev, balance: event.target.value }))} placeholder="0.00" required />
            </label>
            <label>
              Institution
              <input value={form.institution} onChange={(event) => setForm((prev) => ({ ...prev, institution: event.target.value }))} placeholder="Optional" />
            </label>
          </div>
          <label>
            Notes
            <textarea rows={3} value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Optional context for this account." />
          </label>
          <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Account'}</button>
        </form>

        <div className="networth-viz">
          <div className="chart-card">
            <h4>Net Worth Trend</h4>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={summary.snapshot_history}>
                <defs>
                  <linearGradient id="networthFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="captured_at" tickFormatter={formatChartDate} />
                <YAxis />
                <Tooltip formatter={(value) => currency.format(value)} labelFormatter={formatChartDate} />
                <Area type="monotone" dataKey="net_worth" stroke="#1d4ed8" fill="url(#networthFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h4>Asset Mix</h4>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={summary.asset_breakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value) => currency.format(value)} />
                <Bar dataKey="balance" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="account-list">
        {accounts.length === 0 && <p className="muted">No manual assets or debts yet.</p>}
        {accounts.map((account) => (
          <div className="account-row" key={account.id}>
            <div>
              <div className="account-title-row">
                <strong>{account.name}</strong>
                <span className={`type-pill ${account.account_type}`}>{account.account_type}</span>
              </div>
              <p className="muted">{account.category}{account.institution ? ` • ${account.institution}` : ''}</p>
            </div>
            <div className="account-edit-row">
              <input
                type="number"
                min="0"
                step="0.01"
                value={drafts[account.id]?.balance || ''}
                onChange={(event) => updateDraft(account.id, 'balance', event.target.value)}
              />
              <input
                value={drafts[account.id]?.category || account.category}
                onChange={(event) => updateDraft(account.id, 'category', event.target.value)}
              />
              <button type="button" className="secondary" onClick={() => saveAccount(account.id)} disabled={saving}>
                {saving ? 'Saving...' : 'Update'}
              </button>
              <button type="button" className="ghost" onClick={() => onDeleteAccount(account.id)} disabled={saving}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
