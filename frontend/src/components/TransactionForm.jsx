import React, { useMemo, useState } from 'react';

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
  'other',
];

export default function TransactionForm({ onSubmit, submitting }) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    kind: 'expense',
    category: '',
    merchant: '',
    transaction_date: today,
  });

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.description || !form.amount) return;

    await onSubmit({
      ...form,
      amount: Number(form.amount),
      category: form.category || null,
    });

    setForm((prev) => ({
      ...prev,
      description: '',
      amount: '',
      category: '',
      merchant: '',
      transaction_date: today,
    }));
  };

  return (
    <form className="panel-form" onSubmit={submit}>
      <h3>Add Transaction</h3>
      <label>
        Description
        <input name="description" value={form.description} onChange={onChange} placeholder="Coffee, rent, salary..." required />
      </label>

      <div className="two-col">
        <label>
          Amount
          <input name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={onChange} required />
        </label>
        <label>
          Type
          <select name="kind" value={form.kind} onChange={onChange}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>
      </div>

      <div className="two-col">
        <label>
          Category (optional)
          <select name="category" value={form.category} onChange={onChange}>
            <option value="">Auto classify</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input name="transaction_date" type="date" value={form.transaction_date} onChange={onChange} required />
        </label>
      </div>

      <label>
        Merchant (optional)
        <input name="merchant" value={form.merchant} onChange={onChange} placeholder="Store or provider" />
      </label>

      <button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save Transaction'}</button>
    </form>
  );
}
