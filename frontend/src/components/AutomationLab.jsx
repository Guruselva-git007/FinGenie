import React, { useEffect, useState } from 'react';

import api from '../api/client';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export default function AutomationLab({ onError }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  const [loanInput, setLoanInput] = useState({ principal: 20000, annual_rate: 11, tenure_months: 60 });
  const [sipInput, setSipInput] = useState({ monthly_investment: 300, annual_return_rate: 12, years: 10, annual_step_up_pct: 5 });
  const [goalInput, setGoalInput] = useState({ target_amount: 100000, years: 8, expected_annual_return_rate: 10, current_savings: 5000 });
  const [retInput, setRetInput] = useState({ current_age: 28, retirement_age: 60, monthly_expense_today: 1200, inflation_rate: 5, post_retirement_return_rate: 7, life_expectancy: 85 });

  const [loanResult, setLoanResult] = useState(null);
  const [sipResult, setSipResult] = useState(null);
  const [goalResult, setGoalResult] = useState(null);
  const [retResult, setRetResult] = useState(null);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const response = await api.get('/automation/insights?forecast_months=4');
      setInsights(response.data);
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Failed to load automation insights.';
      onError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  const runLoan = async (event) => {
    event.preventDefault();
    try {
      const response = await api.post('/automation/calculate/loan-emi', {
        principal: Number(loanInput.principal),
        annual_rate: Number(loanInput.annual_rate),
        tenure_months: Number(loanInput.tenure_months),
      });
      setLoanResult(response.data);
    } catch (err) {
      onError(err?.response?.data?.detail || err.message || 'Loan calculation failed.');
    }
  };

  const runSip = async (event) => {
    event.preventDefault();
    try {
      const response = await api.post('/automation/calculate/sip', {
        monthly_investment: Number(sipInput.monthly_investment),
        annual_return_rate: Number(sipInput.annual_return_rate),
        years: Number(sipInput.years),
        annual_step_up_pct: Number(sipInput.annual_step_up_pct),
      });
      setSipResult(response.data);
    } catch (err) {
      onError(err?.response?.data?.detail || err.message || 'SIP calculation failed.');
    }
  };

  const runGoal = async (event) => {
    event.preventDefault();
    try {
      const response = await api.post('/automation/calculate/goal-plan', {
        target_amount: Number(goalInput.target_amount),
        years: Number(goalInput.years),
        expected_annual_return_rate: Number(goalInput.expected_annual_return_rate),
        current_savings: Number(goalInput.current_savings),
      });
      setGoalResult(response.data);
    } catch (err) {
      onError(err?.response?.data?.detail || err.message || 'Goal planning failed.');
    }
  };

  const runRetirement = async (event) => {
    event.preventDefault();
    try {
      const response = await api.post('/automation/calculate/retirement', {
        current_age: Number(retInput.current_age),
        retirement_age: Number(retInput.retirement_age),
        monthly_expense_today: Number(retInput.monthly_expense_today),
        inflation_rate: Number(retInput.inflation_rate),
        post_retirement_return_rate: Number(retInput.post_retirement_return_rate),
        life_expectancy: Number(retInput.life_expectancy),
      });
      setRetResult(response.data);
    } catch (err) {
      onError(err?.response?.data?.detail || err.message || 'Retirement planning failed.');
    }
  };

  return (
    <div className="automation-lab">
      <div className="panel-head">
        <h3>AI/ML/DL Automation Lab</h3>
        <button className="secondary" onClick={loadInsights}>Refresh Models</button>
      </div>

      {loading && <p className="muted">Running models...</p>}

      {insights && (
        <>
          <div className="automation-grid">
            <div className="auto-card">
              <h4>Anomaly Detection (Isolation Forest)</h4>
              {insights.anomalies.length === 0 && <p className="muted">No anomalies detected.</p>}
              {insights.anomalies.map((item) => (
                <div className="auto-row" key={`${item.transaction_id}-${item.anomaly_score}`}>
                  <strong>{item.description}</strong>
                  <p>{item.category} | {currency.format(item.amount)} | score {item.anomaly_score}</p>
                  <p className="muted">{item.reason}</p>
                </div>
              ))}
            </div>

            <div className="auto-card">
              <h4>Recurring Expense Automation</h4>
              {insights.recurring_expenses.length === 0 && <p className="muted">No recurring patterns yet.</p>}
              {insights.recurring_expenses.map((item) => (
                <div className="auto-row" key={`${item.description}-${item.next_expected_date}`}>
                  <strong>{item.description}</strong>
                  <p>{item.cadence} | {currency.format(item.amount)} | next {item.next_expected_date}</p>
                  <p className="muted">confidence {Math.round(item.confidence * 100)}%</p>
                </div>
              ))}
            </div>

            <div className="auto-card">
              <h4>Savings Prediction (ML)</h4>
              {insights.savings_prediction_ml.map((item) => (
                <div className="auto-mini" key={`ml-${item.month}`}>
                  <span>{item.month}</span>
                  <strong>{currency.format(item.predicted_net_savings)}</strong>
                </div>
              ))}
            </div>

            <div className="auto-card">
              <h4>Savings Prediction (DL)</h4>
              {insights.savings_prediction_dl.map((item) => (
                <div className="auto-mini" key={`dl-${item.month}`}>
                  <span>{item.month}</span>
                  <strong>{currency.format(item.predicted_net_savings)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="auto-card">
            <h4>Budget Optimization Engine</h4>
            <p className="muted">
              Current savings rate: {(insights.budget_optimization.current_savings_rate * 100).toFixed(1)}% | Target: {(insights.budget_optimization.target_savings_rate * 100).toFixed(1)}%
            </p>
            <p className="muted">Monthly reduction needed: {currency.format(insights.budget_optimization.monthly_reduction_needed)}</p>
            <div className="budget-plan-grid">
              {insights.budget_optimization.budget_plan.slice(0, 8).map((item) => (
                <div className="auto-row" key={`plan-${item.category}`}>
                  <strong>{item.category}</strong>
                  <p>Current {currency.format(item.current_avg_spend)} {'->'} Recommended {currency.format(item.recommended_limit)}</p>
                  <p className="muted">Suggested cut: {currency.format(item.suggested_cut)}</p>
                </div>
              ))}
            </div>
            <ul>
              {insights.auto_actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div className="calculator-grid">
        <form className="auto-card calculator" onSubmit={runLoan}>
          <h4>Loan EMI Calculator</h4>
          <input type="number" value={loanInput.principal} onChange={(e) => setLoanInput((p) => ({ ...p, principal: e.target.value }))} placeholder="Principal" />
          <input type="number" value={loanInput.annual_rate} onChange={(e) => setLoanInput((p) => ({ ...p, annual_rate: e.target.value }))} placeholder="Annual rate %" />
          <input type="number" value={loanInput.tenure_months} onChange={(e) => setLoanInput((p) => ({ ...p, tenure_months: e.target.value }))} placeholder="Tenure months" />
          <button type="submit">Calculate EMI</button>
          {loanResult && <p className="muted">EMI {currency.format(loanResult.emi)} | Interest {currency.format(loanResult.total_interest)}</p>}
        </form>

        <form className="auto-card calculator" onSubmit={runSip}>
          <h4>SIP Projection</h4>
          <input type="number" value={sipInput.monthly_investment} onChange={(e) => setSipInput((p) => ({ ...p, monthly_investment: e.target.value }))} placeholder="Monthly investment" />
          <input type="number" value={sipInput.annual_return_rate} onChange={(e) => setSipInput((p) => ({ ...p, annual_return_rate: e.target.value }))} placeholder="Annual return %" />
          <input type="number" value={sipInput.years} onChange={(e) => setSipInput((p) => ({ ...p, years: e.target.value }))} placeholder="Years" />
          <input type="number" value={sipInput.annual_step_up_pct} onChange={(e) => setSipInput((p) => ({ ...p, annual_step_up_pct: e.target.value }))} placeholder="Step-up %" />
          <button type="submit">Project SIP</button>
          {sipResult && <p className="muted">Future value {currency.format(sipResult.future_value)} | Returns {currency.format(sipResult.estimated_returns)}</p>}
        </form>

        <form className="auto-card calculator" onSubmit={runGoal}>
          <h4>Goal Planner</h4>
          <input type="number" value={goalInput.target_amount} onChange={(e) => setGoalInput((p) => ({ ...p, target_amount: e.target.value }))} placeholder="Target amount" />
          <input type="number" value={goalInput.years} onChange={(e) => setGoalInput((p) => ({ ...p, years: e.target.value }))} placeholder="Years" />
          <input type="number" value={goalInput.expected_annual_return_rate} onChange={(e) => setGoalInput((p) => ({ ...p, expected_annual_return_rate: e.target.value }))} placeholder="Expected return %" />
          <input type="number" value={goalInput.current_savings} onChange={(e) => setGoalInput((p) => ({ ...p, current_savings: e.target.value }))} placeholder="Current savings" />
          <button type="submit">Plan Goal</button>
          {goalResult && <p className="muted">Required monthly investment {currency.format(goalResult.required_monthly_investment)}</p>}
        </form>

        <form className="auto-card calculator" onSubmit={runRetirement}>
          <h4>Retirement Planner</h4>
          <input type="number" value={retInput.current_age} onChange={(e) => setRetInput((p) => ({ ...p, current_age: e.target.value }))} placeholder="Current age" />
          <input type="number" value={retInput.retirement_age} onChange={(e) => setRetInput((p) => ({ ...p, retirement_age: e.target.value }))} placeholder="Retirement age" />
          <input type="number" value={retInput.monthly_expense_today} onChange={(e) => setRetInput((p) => ({ ...p, monthly_expense_today: e.target.value }))} placeholder="Monthly expense today" />
          <input type="number" value={retInput.inflation_rate} onChange={(e) => setRetInput((p) => ({ ...p, inflation_rate: e.target.value }))} placeholder="Inflation %" />
          <input type="number" value={retInput.post_retirement_return_rate} onChange={(e) => setRetInput((p) => ({ ...p, post_retirement_return_rate: e.target.value }))} placeholder="Post-retirement return %" />
          <input type="number" value={retInput.life_expectancy} onChange={(e) => setRetInput((p) => ({ ...p, life_expectancy: e.target.value }))} placeholder="Life expectancy" />
          <button type="submit">Plan Retirement</button>
          {retResult && <p className="muted">Required corpus {currency.format(retResult.required_retirement_corpus)}</p>}
        </form>
      </div>
    </div>
  );
}
