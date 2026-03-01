import React, { useState } from 'react';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function BudgetPanel({ budgets, smartPlan, onSaveBudget, loading }) {
  const [category, setCategory] = useState('groceries');
  const [monthlyLimit, setMonthlyLimit] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!monthlyLimit) return;
    await onSaveBudget({ category, monthly_limit: Number(monthlyLimit) });
    setMonthlyLimit('');
  };

  return (
    <div>
      <h3>Smart Budgeting</h3>

      <form className="inline-form" onSubmit={submit}>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="groceries">groceries</option>
          <option value="dining">dining</option>
          <option value="shopping">shopping</option>
          <option value="transport">transport</option>
          <option value="entertainment">entertainment</option>
          <option value="utilities">utilities</option>
          <option value="rent">rent</option>
          <option value="healthcare">healthcare</option>
        </select>
        <input
          type="number"
          min="0"
          step="0.01"
          value={monthlyLimit}
          onChange={(event) => setMonthlyLimit(event.target.value)}
          placeholder="Monthly cap"
        />
        <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
      </form>

      <div className="budget-list">
        {budgets.length === 0 && <p className="muted">No budgets yet.</p>}
        {budgets.map((budget) => (
          <div className="budget-row" key={budget.id}>
            <span>{budget.category}</span>
            <strong>{currency.format(budget.monthly_limit)}</strong>
          </div>
        ))}
      </div>

      {smartPlan && (
        <div className="smart-plan">
          <h4>AI Allocation</h4>
          <p>Income estimate: {currency.format(smartPlan.monthly_income_estimate)}</p>
          <p>Needs: {currency.format(smartPlan.allocation.needs)}</p>
          <p>Wants: {currency.format(smartPlan.allocation.wants)}</p>
          <p>Savings: {currency.format(smartPlan.allocation.savings)}</p>
        </div>
      )}
    </div>
  );
}
