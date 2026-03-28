import React, { useEffect, useRef, useState } from 'react';

import api from '../api/client';

const quickPrompts = [
  'Review my subscriptions',
  'Create task pay EMI tomorrow',
  'Set savings target to 10000',
  'How can I cut expenses this month?',
];

const starterMessage = {
  role: 'assistant',
  content: 'I am live here for quick tasks, support, and fast finance questions.',
  actionItems: [],
  automationEvents: [],
  followUpQuestions: [],
};

function resolveError(err, fallback) {
  return err?.response?.data?.detail || err.message || fallback;
}

export default function FloatingAssistant({ onError, onDataMutation }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([starterMessage]);
  const logRef = useRef(null);

  useEffect(() => {
    if (!logRef.current) {
      return;
    }
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, isOpen]);

  const sendMessage = async (draft = input) => {
    const message = draft.trim();
    if (!message || loading) {
      return;
    }

    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/assistant/chat', { message });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.data.answer,
          actionItems: response.data.action_items || [],
          automationEvents: response.data.automation_events || [],
          followUpQuestions: response.data.follow_up_questions || [],
        },
      ]);

      if (response.data.automation_events?.length > 0 && onDataMutation) {
        await onDataMutation();
      }
    } catch (err) {
      const messageText = resolveError(err, 'Assistant request failed.');
      onError?.(messageText);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I could not complete that request just now. Please try again in a moment.',
          actionItems: [],
          automationEvents: [],
          followUpQuestions: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    await sendMessage();
  };

  return (
    <div className={`floating-assistant ${isOpen ? 'open' : ''}`}>
      {isOpen && (
        <section className="floating-assistant-panel" role="dialog" aria-label="Live Genie assistant">
          <div className="floating-assistant-head">
            <div>
              <p className="eyebrow">Live Assistant</p>
              <h3>Genie Mini Support</h3>
            </div>
            <button type="button" className="ghost" onClick={() => setIsOpen(false)}>
              Close
            </button>
          </div>

          <div className="floating-assistant-prompts">
            {quickPrompts.map((prompt) => (
              <button key={prompt} type="button" className="tab-chip" onClick={() => sendMessage(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <div className="floating-assistant-log" ref={logRef}>
            {messages.map((item, index) => (
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
                    {item.automationEvents.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                )}
                {item.followUpQuestions?.length > 0 && (
                  <div className="floating-followups">
                    {item.followUpQuestions.slice(0, 3).map((line) => (
                      <button key={line} type="button" className="ghost" onClick={() => sendMessage(line)}>
                        {line}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form className="floating-assistant-form" onSubmit={onSubmit}>
            <textarea
              rows={3}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask for a quick task, support, or a money check-in"
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Running...' : 'Send'}
            </button>
          </form>
        </section>
      )}

      <button type="button" className="assistant-fab" onClick={() => setIsOpen((prev) => !prev)}>
        {isOpen ? 'Hide Genie' : 'Ask Genie'}
      </button>
    </div>
  );
}
