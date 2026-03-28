import React, { useState } from 'react';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

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
    <div className="planning-card">
      <div className="panel-head">
        <div>
          <h3>Budgets</h3>
        </div>
      </div>

      <form className="inline-form budget-form" onSubmit={submit}>
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
        <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Budget'}</button>
      </form>

      <div className="planner-subcard">
        <h4>Current Budgets</h4>
        <div className="budget-list">
          {budgets.length === 0 && <p className="muted">No budgets yet.</p>}
          {budgets.map((budget) => (
            <div className="budget-row" key={budget.id}>
              <span>{budget.category}</span>
              <strong>{currency.format(budget.monthly_limit)}</strong>
            </div>
          ))}
        </div>
      </div>

      {smartPlan && (
        <div className="planning-radar-grid">
          <div className="planner-subcard">
            <h4>Monthly Allocation</h4>
            <div className="goal-mini-grid">
              <div className="kpi-box">
                <p className="muted">Needs</p>
                <strong>{currency.format(smartPlan.allocation.needs)}</strong>
              </div>
              <div className="kpi-box">
                <p className="muted">Wants</p>
                <strong>{currency.format(smartPlan.allocation.wants)}</strong>
              </div>
              <div className="kpi-box">
                <p className="muted">Savings</p>
                <strong>{currency.format(smartPlan.allocation.savings)}</strong>
              </div>
            </div>
            <p className="muted">Income estimate: {currency.format(smartPlan.monthly_income_estimate)}</p>
          </div>

          <div className="planner-subcard">
            <h4>Suggested Caps</h4>
            {smartPlan.category_caps.map((item) => (
              <div className="planner-row" key={item.category}>
                <span>{item.category}</span>
                <strong>{currency.format(item.recommended_limit)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {smartPlan?.notes?.length > 0 && (
        <div className="planner-subcard">
          <h4>Plan Notes</h4>
          <ul className="insight-list">
            {smartPlan.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
