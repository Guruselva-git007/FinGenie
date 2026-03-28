import React, { useState } from 'react';

import BudgetPanel from './BudgetPanel';
import GoalsBoard from './GoalsBoard';
import NetWorthTracker from './NetWorthTracker';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function PlannerHub({
  budgets,
  smartPlan,
  goals,
  goalsSummary,
  netWorth,
  billCalendar,
  recurringExpenses,
  subscriptionOpportunities,
  onSaveBudget,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
  savingBudget,
  savingPlanning,
}) {
  const [activeTab, setActiveTab] = useState('budget');
  const netWorthSummary = netWorth?.summary;

  return (
    <div className="section-stack">
      <section className="panel planner-intro">
        <div className="planner-banner">
          <div>
            <p className="eyebrow">Planner</p>
            <h3>Budgets, goals, bills, net worth.</h3>
          </div>
          <div className="planner-banner-metrics">
            <div className="planner-mini-stat">
              <span className="muted">Goal funding</span>
              <strong>{goalsSummary?.completion_pct ?? 0}%</strong>
            </div>
            <div className="planner-mini-stat">
              <span className="muted">Bills in queue</span>
              <strong>{billCalendar.length}</strong>
            </div>
            <div className="planner-mini-stat">
              <span className="muted">Net worth</span>
              <strong>{currency.format(netWorthSummary?.net_worth || 0)}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="tab-row" role="tablist" aria-label="Planner Views">
        <button type="button" className={`tab-chip ${activeTab === 'budget' ? 'active' : ''}`} onClick={() => setActiveTab('budget')}>
          Budget
        </button>
        <button type="button" className={`tab-chip ${activeTab === 'goals' ? 'active' : ''}`} onClick={() => setActiveTab('goals')}>
          Goals
        </button>
        <button type="button" className={`tab-chip ${activeTab === 'networth' ? 'active' : ''}`} onClick={() => setActiveTab('networth')}>
          Net Worth
        </button>
      </div>

      {activeTab === 'budget' && (
        <div className="planner-grid">
          <section className="panel">
            <BudgetPanel budgets={budgets} smartPlan={smartPlan} onSaveBudget={onSaveBudget} loading={savingBudget} />
          </section>

          <section className="panel">
            <div className="planning-card">
              <h3>Recurring</h3>

              <div className="planning-radar-grid">
                <div className="planner-subcard">
                  <h4>Upcoming Bills</h4>
                  {billCalendar.length === 0 && <p className="muted">No bills.</p>}
                  {billCalendar.slice(0, 5).map((bill) => (
                    <div className="planner-row" key={`${bill.description}-${bill.due_date}`}>
                      <div>
                        <strong>{bill.description}</strong>
                        <p className="muted">{bill.category} • {bill.due_date}</p>
                      </div>
                      <div className="planner-row-right">
                        <span className={`status-pill status-${bill.urgency}`}>{bill.days_left}d</span>
                        <strong>{currency.format(bill.amount)}</strong>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="planner-subcard">
                  <h4>Subscriptions</h4>
                  {subscriptionOpportunities.length === 0 && <p className="muted">No suggestions.</p>}
                  {subscriptionOpportunities.slice(0, 4).map((item) => (
                    <div className="planner-row" key={`${item.description}-${item.annual_cost}`}>
                      <div>
                        <strong>{item.description}</strong>
                        <p className="muted">{item.action}</p>
                      </div>
                      <div className="planner-row-right">
                        <span className={`status-pill status-${item.priority}`}>{item.priority}</span>
                        <strong>{currency.format(item.annual_cost)}/yr</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="planner-subcard">
                <h4>Recurring Commitments</h4>
                {recurringExpenses.length === 0 && <p className="muted">No recurring patterns yet.</p>}
                {recurringExpenses.slice(0, 6).map((item) => (
                  <div className="planner-row" key={`${item.description}-${item.next_expected_date}`}>
                    <div>
                      <strong>{item.description}</strong>
                      <p className="muted">{item.category} • {item.cadence}</p>
                    </div>
                    <strong>{currency.format(item.amount)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'goals' && (
        <section className="panel">
          <GoalsBoard
            goals={goals}
            goalsSummary={goalsSummary}
            onCreateGoal={onCreateGoal}
            onUpdateGoal={onUpdateGoal}
            onDeleteGoal={onDeleteGoal}
            saving={savingPlanning}
          />
        </section>
      )}

      {activeTab === 'networth' && (
        <section className="panel">
          <NetWorthTracker
            netWorth={netWorth}
            onCreateAccount={onCreateAccount}
            onUpdateAccount={onUpdateAccount}
            onDeleteAccount={onDeleteAccount}
            saving={savingPlanning}
          />
        </section>
      )}
    </div>
  );
}
