import React, { useEffect, useMemo, useState } from 'react';

import api from '../api/client';

const categories = [
  'groceries',
  'rent',
  'utilities',
  'transport',
  'dining',
  'entertainment',
  'healthcare',
  'shopping',
  'travel',
  'education',
  'salary',
  'loan',
  'other',
];

export default function TransactionForm({ onSubmit, submitting, compact = false }) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    kind: 'expense',
    category: '',
    merchant: '',
    branch_account_id: '',
    transaction_date: today,
  });
  const [branches, setBranches] = useState([]);

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

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const setKind = (kind) => {
    setForm((prev) => ({ ...prev, kind }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.description || !form.amount) return;

    await onSubmit({
      ...form,
      amount: Number(form.amount),
      category: form.category || null,
      branch_account_id: form.branch_account_id ? Number(form.branch_account_id) : null,
    });

    setForm((prev) => ({
      ...prev,
      description: '',
      amount: '',
      category: '',
      merchant: '',
      branch_account_id: '',
      transaction_date: today,
    }));
  };

  return (
    <form className={`panel-form transaction-entry-form ${compact ? 'compact-form' : ''}`} onSubmit={submit}>
      <div className="tx-form-head">
        <div>
          <h3>{compact ? 'Quick Add' : 'Add Transaction'}</h3>
          <p className="muted">Fast entry with optional branch tagging.</p>
        </div>
        <div className="tx-kind-toggle" role="tablist" aria-label="Transaction Type">
          <button
            type="button"
            className={`tx-kind-btn ${form.kind === 'expense' ? 'active' : ''}`}
            onClick={() => setKind('expense')}
          >
            Expense
          </button>
          <button
            type="button"
            className={`tx-kind-btn ${form.kind === 'income' ? 'active' : ''}`}
            onClick={() => setKind('income')}
          >
            Income
          </button>
        </div>
      </div>

      <div className="tx-grid">
        <label className="tx-span-2">
          Description
          <input name="description" value={form.description} onChange={onChange} placeholder="Rent, groceries, salary, branch collection..." required />
        </label>

        <label>
          Amount (INR)
          <input name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={onChange} placeholder="0.00" required />
        </label>

        <label>
          Date
          <input name="transaction_date" type="date" value={form.transaction_date} onChange={onChange} required />
        </label>

        <label>
          Merchant
          <input name="merchant" value={form.merchant} onChange={onChange} placeholder="Store or provider name" />
        </label>

        <label>
          Category
          <select name="category" value={form.category} onChange={onChange}>
            <option value="">Auto classify</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="tx-span-2">
          Branch Tag
          <select name="branch_account_id" value={form.branch_account_id} onChange={onChange}>
            <option value="">Personal / untagged</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="tx-form-footer">
        <p className="muted">Blank category = auto classify. Branch tags feed branch profit/loss reports automatically.</p>
        <button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save Transaction'}</button>
      </div>
    </form>
  );
}
