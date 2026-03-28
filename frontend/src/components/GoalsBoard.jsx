import React, { useEffect, useMemo, useState } from 'react';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const emptyGoalForm = {
  title: '',
  category: 'emergency',
  target_amount: '',
  current_amount: '',
  monthly_contribution: '',
  target_date: '',
  notes: '',
};

export default function GoalsBoard({ goals, goalsSummary, onCreateGoal, onUpdateGoal, onDeleteGoal, saving }) {
  const [form, setForm] = useState(emptyGoalForm);
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    setDrafts((prev) => {
      const next = {};
      goals.forEach((goal) => {
        next[goal.id] = prev[goal.id] || {
          current_amount: String(goal.current_amount ?? ''),
          monthly_contribution: String(goal.monthly_contribution ?? ''),
          status: goal.status,
        };
      });
      return next;
    });
  }, [goals]);

  const activeGoals = useMemo(
    () => goals.filter((goal) => goal.status !== 'achieved'),
    [goals]
  );

  const submitGoal = async (event) => {
    event.preventDefault();
    if (!form.title || !form.target_amount) return;

    await onCreateGoal({
      ...form,
      target_amount: Number(form.target_amount),
      current_amount: Number(form.current_amount || 0),
      monthly_contribution: Number(form.monthly_contribution || 0),
      target_date: form.target_date || null,
      notes: form.notes || null,
    });

    setForm(emptyGoalForm);
  };

  const saveGoal = async (goalId) => {
    const draft = drafts[goalId];
    if (!draft) return;

    await onUpdateGoal(goalId, {
      current_amount: Number(draft.current_amount || 0),
      monthly_contribution: Number(draft.monthly_contribution || 0),
      status: draft.status,
    });
  };

  const updateDraft = (goalId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [goalId]: {
        ...prev[goalId],
        [field]: value,
      },
    }));
  };

  return (
    <div className="goals-board">
      <div className="panel-head">
        <div>
          <h3>Goals</h3>
        </div>
        <div className="planner-banner-metrics">
          <div className="planner-mini-stat">
            <span className="muted">Active goals</span>
            <strong>{goalsSummary?.active_goals ?? 0}</strong>
          </div>
          <div className="planner-mini-stat">
            <span className="muted">On track</span>
            <strong>{goalsSummary?.on_track_goals ?? 0}</strong>
          </div>
          <div className="planner-mini-stat">
            <span className="muted">Saved so far</span>
            <strong>{currency.format(goalsSummary?.total_saved || 0)}</strong>
          </div>
        </div>
      </div>

      <div className="goals-layout">
        <form className="goal-form" onSubmit={submitGoal}>
          <label>
            Goal name
            <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Emergency fund, travel, laptop..." required />
          </label>
          <div className="two-col">
            <label>
              Category
              <select value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}>
                <option value="emergency">emergency</option>
                <option value="travel">travel</option>
                <option value="home">home</option>
                <option value="education">education</option>
                <option value="investing">investing</option>
                <option value="family">family</option>
              </select>
            </label>
            <label>
              Target date
              <input type="date" value={form.target_date} onChange={(event) => setForm((prev) => ({ ...prev, target_date: event.target.value }))} />
            </label>
          </div>
          <div className="two-col">
            <label>
              Target amount
              <input type="number" min="0" step="0.01" value={form.target_amount} onChange={(event) => setForm((prev) => ({ ...prev, target_amount: event.target.value }))} placeholder="0.00" required />
            </label>
            <label>
              Saved already
              <input type="number" min="0" step="0.01" value={form.current_amount} onChange={(event) => setForm((prev) => ({ ...prev, current_amount: event.target.value }))} placeholder="0.00" />
            </label>
          </div>
          <label>
            Monthly contribution
            <input type="number" min="0" step="0.01" value={form.monthly_contribution} onChange={(event) => setForm((prev) => ({ ...prev, monthly_contribution: event.target.value }))} placeholder="0.00" />
          </label>
          <label>
            Notes
            <textarea rows={3} value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Why this goal matters, or any deadline notes." />
          </label>
          <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Goal'}</button>
        </form>

        <div className="goal-list">
          {activeGoals.length === 0 && <p className="muted">No active goals.</p>}
          {activeGoals.map((goal) => (
            <div className="goal-card" key={goal.id}>
              <div className="goal-card-head">
                <div>
                  <h4>{goal.title}</h4>
                  <p className="muted">{goal.category} • {goal.target_date || 'No target date'}</p>
                </div>
                <span className={`status-pill status-${goal.pace_status}`}>{goal.pace_status.replace('_', ' ')}</span>
              </div>

              <div className="goal-progress-meta">
                <strong>{currency.format(goal.current_amount)}</strong>
                <span className="muted">of {currency.format(goal.target_amount)}</span>
                <strong>{goal.progress_pct}%</strong>
              </div>

              <div className="progress-track">
                <span style={{ width: `${Math.min(goal.progress_pct, 100)}%` }} />
              </div>

              <div className="goal-mini-grid">
                <div className="kpi-box">
                  <p className="muted">Remaining</p>
                  <strong>{currency.format(goal.remaining_amount)}</strong>
                </div>
                <div className="kpi-box">
                  <p className="muted">Monthly plan</p>
                  <strong>{currency.format(goal.monthly_contribution)}</strong>
                </div>
                <div className="kpi-box">
                  <p className="muted">Needed pace</p>
                  <strong>{currency.format(goal.required_monthly_to_hit_target || 0)}</strong>
                </div>
              </div>

              <div className="goal-edit-grid">
                <label>
                  Saved so far
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={drafts[goal.id]?.current_amount || ''}
                    onChange={(event) => updateDraft(goal.id, 'current_amount', event.target.value)}
                  />
                </label>
                <label>
                  Monthly contribution
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={drafts[goal.id]?.monthly_contribution || ''}
                    onChange={(event) => updateDraft(goal.id, 'monthly_contribution', event.target.value)}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={drafts[goal.id]?.status || goal.status}
                    onChange={(event) => updateDraft(goal.id, 'status', event.target.value)}
                  >
                    <option value="active">active</option>
                    <option value="paused">paused</option>
                    <option value="achieved">achieved</option>
                  </select>
                </label>
              </div>

              <div className="row-actions">
                <button type="button" className="secondary" onClick={() => saveGoal(goal.id)} disabled={saving}>
                  {saving ? 'Saving...' : 'Update Goal'}
                </button>
                <button type="button" className="ghost" onClick={() => onDeleteGoal(goal.id)} disabled={saving}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
