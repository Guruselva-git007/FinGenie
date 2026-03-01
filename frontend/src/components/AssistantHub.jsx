import React, { useEffect, useMemo, useState } from 'react';

import api from '../api/client';

export default function AssistantHub({ onError, onDataMutation }) {
  const [chatInput, setChatInput] = useState('Create task review subscriptions tomorrow');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'assistant',
      content: 'I can automate tasks, preferences, donation pledges, and feedback logging directly from chat.',
      actionItems: [],
      automationEvents: [],
    },
  ]);

  const [preferences, setPreferences] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [donations, setDonations] = useState([]);

  const [savingPreferences, setSavingPreferences] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [submittingDonation, setSubmittingDonation] = useState(false);

  const [taskForm, setTaskForm] = useState({ title: '', details: '', due_date: '', priority: 'medium' });
  const [feedbackForm, setFeedbackForm] = useState({ category: 'general', message: '', rating: 5 });
  const [donationForm, setDonationForm] = useState({ cause: 'education', amount: '', recurring: false, note: '' });

  const loadAssistantData = async () => {
    try {
      const [prefRes, taskRes, donationRes] = await Promise.all([
        api.get('/assistant/preferences'),
        api.get('/assistant/tasks'),
        api.get('/assistant/donations'),
      ]);
      setPreferences(prefRes.data);
      setTasks(taskRes.data);
      setDonations(donationRes.data);
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Assistant data load failed.';
      onError(message);
    }
  };

  useEffect(() => {
    loadAssistantData();
  }, []);

  const sendChat = async (event) => {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message) return;

    setChatHistory((prev) => [...prev, { role: 'user', content: message }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await api.post('/assistant/chat', { message });
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.data.answer,
          actionItems: response.data.action_items,
          automationEvents: response.data.automation_events,
        },
      ]);
      if (response.data.automation_events.length > 0) {
        await loadAssistantData();
      }
    } catch (err) {
      const errorMessage = err?.response?.data?.detail || err.message || 'Assistant request failed.';
      onError(errorMessage);
    } finally {
      setChatLoading(false);
    }
  };

  const savePreferences = async (event) => {
    event.preventDefault();
    if (!preferences) return;
    setSavingPreferences(true);
    try {
      await api.put('/assistant/preferences', {
        ...preferences,
        currency: preferences.currency.toUpperCase(),
        risk_profile: preferences.risk_profile.toLowerCase(),
      });
      await loadAssistantData();
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Failed to save preferences.';
      onError(message);
    } finally {
      setSavingPreferences(false);
    }
  };

  const createTask = async (event) => {
    event.preventDefault();
    if (!taskForm.title.trim()) return;

    setAddingTask(true);
    try {
      await api.post('/assistant/tasks', {
        title: taskForm.title,
        details: taskForm.details || null,
        due_date: taskForm.due_date || null,
        priority: taskForm.priority,
      });
      setTaskForm({ title: '', details: '', due_date: '', priority: 'medium' });
      await loadAssistantData();
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Failed to create task.';
      onError(message);
    } finally {
      setAddingTask(false);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      await api.patch(`/assistant/tasks/${taskId}`, { status });
      await loadAssistantData();
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Failed to update task.';
      onError(message);
    }
  };

  const submitFeedback = async (event) => {
    event.preventDefault();
    if (!feedbackForm.message.trim()) return;

    setSubmittingFeedback(true);
    try {
      await api.post('/assistant/feedback', {
        category: feedbackForm.category,
        message: feedbackForm.message,
        rating: Number(feedbackForm.rating),
      });
      setFeedbackForm((prev) => ({ ...prev, message: '' }));
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', content: 'Feedback saved. I can convert this into prioritized tasks if you want.' },
      ]);
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Feedback submission failed.';
      onError(message);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const submitDonation = async (event) => {
    event.preventDefault();
    if (!donationForm.amount) return;

    setSubmittingDonation(true);
    try {
      await api.post('/assistant/donations', {
        cause: donationForm.cause,
        amount: Number(donationForm.amount),
        recurring: donationForm.recurring,
        note: donationForm.note || null,
      });
      setDonationForm({ cause: donationForm.cause, amount: '', recurring: donationForm.recurring, note: '' });
      await loadAssistantData();
      if (onDataMutation) await onDataMutation();
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Donation pledge failed.';
      onError(message);
    } finally {
      setSubmittingDonation(false);
    }
  };

  const openTaskCount = useMemo(
    () => tasks.filter((task) => task.status === 'pending' || task.status === 'in_progress').length,
    [tasks]
  );

  return (
    <div className="assistant-hub">
      <div className="assistant-topline">
        <h3>Genie Assistant</h3>
        <span className="chip">Open tasks: {openTaskCount}</span>
      </div>

      <div className="assistant-chat">
        <div className="chat-log">
          {chatHistory.map((item, index) => (
            <div key={`${item.role}-${index}`} className={`chat-bubble ${item.role}`}>
              <p>{item.content}</p>
              {item.actionItems?.length > 0 && (
                <ul>
                  {item.actionItems.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
              {item.automationEvents?.length > 0 && (
                <div className="automation-events">
                  {item.automationEvents.map((eventLine) => (
                    <p key={eventLine}>{eventLine}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <form className="assistant-form" onSubmit={sendChat}>
          <textarea
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            rows={3}
            placeholder="Try: create task review budget tomorrow; set savings target 800; donate 25 to education"
          />
          <button type="submit" disabled={chatLoading}>{chatLoading ? 'Running...' : 'Run Assistant'}</button>
        </form>
      </div>

      <div className="assistant-sections">
        <div className="assistant-card">
          <h4>Customization & Preferences</h4>
          {preferences && (
            <form className="assistant-form" onSubmit={savePreferences}>
              <div className="two-col">
                <label>
                  Currency
                  <input
                    value={preferences.currency}
                    onChange={(event) => setPreferences((prev) => ({ ...prev, currency: event.target.value }))}
                  />
                </label>
                <label>
                  Risk Profile
                  <select
                    value={preferences.risk_profile}
                    onChange={(event) => setPreferences((prev) => ({ ...prev, risk_profile: event.target.value }))}
                  >
                    <option value="conservative">conservative</option>
                    <option value="balanced">balanced</option>
                    <option value="aggressive">aggressive</option>
                  </select>
                </label>
              </div>

              <div className="two-col">
                <label>
                  Savings Target
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={preferences.monthly_savings_target}
                    onChange={(event) => setPreferences((prev) => ({ ...prev, monthly_savings_target: Number(event.target.value) }))}
                  />
                </label>
                <label>
                  Theme
                  <select
                    value={preferences.theme}
                    onChange={(event) => setPreferences((prev) => ({ ...prev, theme: event.target.value }))}
                  >
                    <option value="minimal-light">minimal-light</option>
                    <option value="classic-light">classic-light</option>
                    <option value="calm-light">calm-light</option>
                  </select>
                </label>
              </div>

              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={preferences.notifications_enabled}
                  onChange={(event) => setPreferences((prev) => ({ ...prev, notifications_enabled: event.target.checked }))}
                />
                Enable proactive notifications
              </label>

              <button type="submit" disabled={savingPreferences}>{savingPreferences ? 'Saving...' : 'Save Preferences'}</button>
            </form>
          )}
        </div>

        <div className="assistant-card">
          <h4>Automation Tasks</h4>
          <form className="assistant-form" onSubmit={createTask}>
            <input
              value={taskForm.title}
              onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Task title"
              required
            />
            <textarea
              rows={2}
              value={taskForm.details}
              onChange={(event) => setTaskForm((prev) => ({ ...prev, details: event.target.value }))}
              placeholder="Task details"
            />
            <div className="two-col">
              <input
                type="date"
                value={taskForm.due_date}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, due_date: event.target.value }))}
              />
              <select
                value={taskForm.priority}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, priority: event.target.value }))}
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </div>
            <button type="submit" disabled={addingTask}>{addingTask ? 'Adding...' : 'Add Task'}</button>
          </form>

          <div className="task-list">
            {tasks.map((task) => (
              <div key={task.id} className="task-item">
                <div>
                  <strong>{task.title}</strong>
                  <p className="muted">{task.priority} | {task.status}{task.due_date ? ` | due ${task.due_date}` : ''}</p>
                </div>
                <select value={task.status} onChange={(event) => updateTaskStatus(task.id, event.target.value)}>
                  <option value="pending">pending</option>
                  <option value="in_progress">in_progress</option>
                  <option value="done">done</option>
                </select>
              </div>
            ))}
            {tasks.length === 0 && <p className="muted">No assistant tasks yet.</p>}
          </div>
        </div>

        <div className="assistant-card">
          <h4>Feedback & Suggestions</h4>
          <form className="assistant-form" onSubmit={submitFeedback}>
            <div className="two-col">
              <select
                value={feedbackForm.category}
                onChange={(event) => setFeedbackForm((prev) => ({ ...prev, category: event.target.value }))}
              >
                <option value="general">general</option>
                <option value="bug">bug</option>
                <option value="feature">feature</option>
                <option value="ux">ux</option>
              </select>
              <select
                value={feedbackForm.rating}
                onChange={(event) => setFeedbackForm((prev) => ({ ...prev, rating: event.target.value }))}
              >
                <option value="5">5</option>
                <option value="4">4</option>
                <option value="3">3</option>
                <option value="2">2</option>
                <option value="1">1</option>
              </select>
            </div>
            <textarea
              rows={3}
              value={feedbackForm.message}
              onChange={(event) => setFeedbackForm((prev) => ({ ...prev, message: event.target.value }))}
              placeholder="Share suggestion, issue, or customization request"
              required
            />
            <button type="submit" disabled={submittingFeedback}>{submittingFeedback ? 'Sending...' : 'Submit Feedback'}</button>
          </form>
        </div>

        <div className="assistant-card">
          <h4>Donations</h4>
          <form className="assistant-form" onSubmit={submitDonation}>
            <div className="two-col">
              <input
                value={donationForm.cause}
                onChange={(event) => setDonationForm((prev) => ({ ...prev, cause: event.target.value }))}
                placeholder="Cause"
                required
              />
              <input
                type="number"
                min="1"
                step="0.01"
                value={donationForm.amount}
                onChange={(event) => setDonationForm((prev) => ({ ...prev, amount: event.target.value }))}
                placeholder="Amount"
                required
              />
            </div>
            <textarea
              rows={2}
              value={donationForm.note}
              onChange={(event) => setDonationForm((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Note (optional)"
            />
            <label className="inline-check">
              <input
                type="checkbox"
                checked={donationForm.recurring}
                onChange={(event) => setDonationForm((prev) => ({ ...prev, recurring: event.target.checked }))}
              />
              Recurring monthly donation
            </label>
            <button type="submit" disabled={submittingDonation}>{submittingDonation ? 'Saving...' : 'Add Donation Pledge'}</button>
          </form>

          <div className="donation-list">
            {donations.slice(0, 5).map((donation) => (
              <div className="task-item" key={donation.id}>
                <div>
                  <strong>{donation.cause}</strong>
                  <p className="muted">{donation.amount} {preferences?.currency || 'USD'} | {donation.recurring ? 'recurring' : 'one-time'}</p>
                </div>
                <span className="chip">{donation.status}</span>
              </div>
            ))}
            {donations.length === 0 && <p className="muted">No donation pledges yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
