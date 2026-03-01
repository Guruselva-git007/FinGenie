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
  const [taxInput, setTaxInput] = useState({ monthly_income: 5000, effective_tax_rate: 22, safety_buffer_pct: 10 });
  const [efInput, setEfInput] = useState({ current_fund: 3000, monthly_expense: 2200, target_months: 6, monthly_contribution: 450, annual_return_rate: 4 });
  const [nwInput, setNwInput] = useState({ current_assets: 25000, current_liabilities: 12000, monthly_investment: 600, annual_return_rate: 9, months: 36, monthly_liability_payment: 250, liability_interest_rate: 6 });
  const [debtInput, setDebtInput] = useState({
    strategy: 'avalanche',
    extra_payment: 150,
    debts: [
      { name: 'Credit Card', balance: 4200, annual_rate: 29, min_payment: 130 },
      { name: 'Personal Loan', balance: 9000, annual_rate: 14, min_payment: 220 },
      { name: 'Auto Loan', balance: 12000, annual_rate: 8, min_payment: 260 },
    ],
  });

  const [loanResult, setLoanResult] = useState(null);
  const [sipResult, setSipResult] = useState(null);
  const [goalResult, setGoalResult] = useState(null);
  const [retResult, setRetResult] = useState(null);
  const [taxResult, setTaxResult] = useState(null);
  const [efResult, setEfResult] = useState(null);
  const [nwResult, setNwResult] = useState(null);
  const [debtResult, setDebtResult] = useState(null);

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

  const postCalc = async (path, payload, setResult, fallbackMessage) => {
    try {
      const response = await api.post(path, payload);
      setResult(response.data);
    } catch (err) {
      onError(err?.response?.data?.detail || err.message || fallbackMessage);
    }
  };

  const runLoan = async (event) => {
    event.preventDefault();
    await postCalc('/automation/calculate/loan-emi', {
      principal: Number(loanInput.principal),
      annual_rate: Number(loanInput.annual_rate),
      tenure_months: Number(loanInput.tenure_months),
    }, setLoanResult, 'Loan calculation failed.');
  };

  const runSip = async (event) => {
    event.preventDefault();
    await postCalc('/automation/calculate/sip', {
      monthly_investment: Number(sipInput.monthly_investment),
      annual_return_rate: Number(sipInput.annual_return_rate),
      years: Number(sipInput.years),
      annual_step_up_pct: Number(sipInput.annual_step_up_pct),
    }, setSipResult, 'SIP calculation failed.');
  };

  const runGoal = async (event) => {
    event.preventDefault();
    await postCalc('/automation/calculate/goal-plan', {
      target_amount: Number(goalInput.target_amount),
      years: Number(goalInput.years),
      expected_annual_return_rate: Number(goalInput.expected_annual_return_rate),
      current_savings: Number(goalInput.current_savings),
    }, setGoalResult, 'Goal planning failed.');
  };

  const runRetirement = async (event) => {
    event.preventDefault();
    await postCalc('/automation/calculate/retirement', {
      current_age: Number(retInput.current_age),
      retirement_age: Number(retInput.retirement_age),
      monthly_expense_today: Number(retInput.monthly_expense_today),
      inflation_rate: Number(retInput.inflation_rate),
      post_retirement_return_rate: Number(retInput.post_retirement_return_rate),
      life_expectancy: Number(retInput.life_expectancy),
    }, setRetResult, 'Retirement planning failed.');
  };

  const runTax = async (event) => {
    event.preventDefault();
    await postCalc('/automation/calculate/tax-setaside', {
      monthly_income: Number(taxInput.monthly_income),
      effective_tax_rate: Number(taxInput.effective_tax_rate),
      safety_buffer_pct: Number(taxInput.safety_buffer_pct),
    }, setTaxResult, 'Tax planning failed.');
  };

  const runEmergencyFund = async (event) => {
    event.preventDefault();
    await postCalc('/automation/calculate/emergency-fund', {
      current_fund: Number(efInput.current_fund),
      monthly_expense: Number(efInput.monthly_expense),
      target_months: Number(efInput.target_months),
      monthly_contribution: Number(efInput.monthly_contribution),
      annual_return_rate: Number(efInput.annual_return_rate),
    }, setEfResult, 'Emergency fund planning failed.');
  };

  const runNetWorthProjection = async (event) => {
    event.preventDefault();
    await postCalc('/automation/calculate/networth-projection', {
      current_assets: Number(nwInput.current_assets),
      current_liabilities: Number(nwInput.current_liabilities),
      monthly_investment: Number(nwInput.monthly_investment),
      annual_return_rate: Number(nwInput.annual_return_rate),
      months: Number(nwInput.months),
      monthly_liability_payment: Number(nwInput.monthly_liability_payment),
      liability_interest_rate: Number(nwInput.liability_interest_rate),
    }, setNwResult, 'Net worth projection failed.');
  };

  const runDebtPayoff = async (event) => {
    event.preventDefault();
    await postCalc('/automation/calculate/debt-payoff', {
      strategy: debtInput.strategy,
      extra_payment: Number(debtInput.extra_payment),
      debts: debtInput.debts.map((debt) => ({
        name: debt.name,
        balance: Number(debt.balance),
        annual_rate: Number(debt.annual_rate),
        min_payment: Number(debt.min_payment),
      })),
    }, setDebtResult, 'Debt payoff simulation failed.');
  };

  const updateDebtRow = (index, field, value) => {
    setDebtInput((prev) => ({
      ...prev,
      debts: prev.debts.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    }));
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
              <h4>Recurring + Bill Calendar</h4>
              {insights.recurring_expenses.slice(0, 3).map((item) => (
                <div className="auto-row" key={`${item.description}-${item.next_expected_date}`}>
                  <strong>{item.description}</strong>
                  <p>{item.cadence} | {currency.format(item.amount)} | next {item.next_expected_date}</p>
                </div>
              ))}
              {insights.bill_calendar.slice(0, 4).map((bill) => (
                <div className="auto-mini" key={`${bill.description}-${bill.due_date}`}>
                  <span>{bill.description} ({bill.days_left}d)</span>
                  <strong>{currency.format(bill.amount)}</strong>
                </div>
              ))}
            </div>

            <div className="auto-card">
              <h4>Subscription Optimizer</h4>
              {insights.subscription_opportunities.length === 0 && <p className="muted">No subscription opportunities found.</p>}
              {insights.subscription_opportunities.map((item) => (
                <div className="auto-row" key={`${item.description}-${item.annual_cost}`}>
                  <strong>{item.description}</strong>
                  <p>{currency.format(item.monthly_cost)} / month | {currency.format(item.annual_cost)} / year</p>
                  <p className="muted">{item.action}</p>
                </div>
              ))}
            </div>

            <div className="auto-card">
              <h4>Envelope / Jars System</h4>
              {insights.envelope_jars.map((jar) => (
                <div className="auto-mini" key={jar.jar}>
                  <span>{jar.jar}</span>
                  <strong>{currency.format(jar.actual_amount)} / {currency.format(jar.target_amount)}</strong>
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
            <h4>Budget Optimization + Nudges</h4>
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
              {insights.behavior_nudges.map((nudge) => (
                <li key={nudge}>{nudge}</li>
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

        <form className="auto-card calculator" onSubmit={runDebtPayoff}>
          <h4>Debt Payoff (Avalanche/Snowball)</h4>
          <select value={debtInput.strategy} onChange={(e) => setDebtInput((p) => ({ ...p, strategy: e.target.value }))}>
            <option value="avalanche">avalanche</option>
            <option value="snowball">snowball</option>
          </select>
          <input type="number" value={debtInput.extra_payment} onChange={(e) => setDebtInput((p) => ({ ...p, extra_payment: e.target.value }))} placeholder="Extra monthly payment" />
          {debtInput.debts.map((row, index) => (
            <div className="debt-row" key={`debt-${index}`}>
              <input value={row.name} onChange={(e) => updateDebtRow(index, 'name', e.target.value)} placeholder="Debt name" />
              <input type="number" value={row.balance} onChange={(e) => updateDebtRow(index, 'balance', e.target.value)} placeholder="Balance" />
              <input type="number" value={row.annual_rate} onChange={(e) => updateDebtRow(index, 'annual_rate', e.target.value)} placeholder="APR %" />
              <input type="number" value={row.min_payment} onChange={(e) => updateDebtRow(index, 'min_payment', e.target.value)} placeholder="Min payment" />
            </div>
          ))}
          <button type="submit">Simulate Debt Payoff</button>
          {debtResult && (
            <p className="muted">
              Debt free in {debtResult.months_to_debt_free} months | Interest {currency.format(debtResult.total_interest_paid)}
            </p>
          )}
        </form>

        <form className="auto-card calculator" onSubmit={runTax}>
          <h4>Tax Set-Aside Planner</h4>
          <input type="number" value={taxInput.monthly_income} onChange={(e) => setTaxInput((p) => ({ ...p, monthly_income: e.target.value }))} placeholder="Monthly income" />
          <input type="number" value={taxInput.effective_tax_rate} onChange={(e) => setTaxInput((p) => ({ ...p, effective_tax_rate: e.target.value }))} placeholder="Effective tax %" />
          <input type="number" value={taxInput.safety_buffer_pct} onChange={(e) => setTaxInput((p) => ({ ...p, safety_buffer_pct: e.target.value }))} placeholder="Buffer %" />
          <button type="submit">Plan Tax Reserve</button>
          {taxResult && <p className="muted">Monthly reserve {currency.format(taxResult.monthly_tax_set_aside)} | Quarterly {currency.format(taxResult.quarterly_tax_set_aside)}</p>}
        </form>

        <form className="auto-card calculator" onSubmit={runEmergencyFund}>
          <h4>Emergency Fund Runway</h4>
          <input type="number" value={efInput.current_fund} onChange={(e) => setEfInput((p) => ({ ...p, current_fund: e.target.value }))} placeholder="Current fund" />
          <input type="number" value={efInput.monthly_expense} onChange={(e) => setEfInput((p) => ({ ...p, monthly_expense: e.target.value }))} placeholder="Monthly expense" />
          <input type="number" value={efInput.target_months} onChange={(e) => setEfInput((p) => ({ ...p, target_months: e.target.value }))} placeholder="Target months" />
          <input type="number" value={efInput.monthly_contribution} onChange={(e) => setEfInput((p) => ({ ...p, monthly_contribution: e.target.value }))} placeholder="Monthly contribution" />
          <input type="number" value={efInput.annual_return_rate} onChange={(e) => setEfInput((p) => ({ ...p, annual_return_rate: e.target.value }))} placeholder="Return %" />
          <button type="submit">Project Emergency Fund</button>
          {efResult && <p className="muted">Gap {currency.format(efResult.funding_gap)} | Months to target {efResult.months_to_target}</p>}
        </form>

        <form className="auto-card calculator" onSubmit={runNetWorthProjection}>
          <h4>Net Worth Projection</h4>
          <input type="number" value={nwInput.current_assets} onChange={(e) => setNwInput((p) => ({ ...p, current_assets: e.target.value }))} placeholder="Current assets" />
          <input type="number" value={nwInput.current_liabilities} onChange={(e) => setNwInput((p) => ({ ...p, current_liabilities: e.target.value }))} placeholder="Current liabilities" />
          <input type="number" value={nwInput.monthly_investment} onChange={(e) => setNwInput((p) => ({ ...p, monthly_investment: e.target.value }))} placeholder="Monthly investment" />
          <input type="number" value={nwInput.annual_return_rate} onChange={(e) => setNwInput((p) => ({ ...p, annual_return_rate: e.target.value }))} placeholder="Return %" />
          <input type="number" value={nwInput.months} onChange={(e) => setNwInput((p) => ({ ...p, months: e.target.value }))} placeholder="Months" />
          <input type="number" value={nwInput.monthly_liability_payment} onChange={(e) => setNwInput((p) => ({ ...p, monthly_liability_payment: e.target.value }))} placeholder="Liability payment" />
          <input type="number" value={nwInput.liability_interest_rate} onChange={(e) => setNwInput((p) => ({ ...p, liability_interest_rate: e.target.value }))} placeholder="Liability rate %" />
          <button type="submit">Project Net Worth</button>
          {nwResult && <p className="muted">Start {currency.format(nwResult.start_net_worth)} {'->'} Projected {currency.format(nwResult.projected_net_worth)}</p>}
        </form>
      </div>
    </div>
  );
}
