import React, { useState } from 'react';

export default function AdvisorPanel({ onAsk, loading, response }) {
  const [question, setQuestion] = useState('How can I improve my savings this month?');

  const submit = async (event) => {
    event.preventDefault();
    await onAsk(question);
  };

  return (
    <div>
      <h3>AI Financial Advisor</h3>
      <form className="advisor-form" onSubmit={submit}>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about budgets, savings, debt, or investments"
          rows={3}
        />
        <button type="submit" disabled={loading}>{loading ? 'Thinking...' : 'Ask Advisor'}</button>
      </form>

      {response && (
        <div className="advisor-response">
          <p>{response.answer}</p>
          <ul>
            {response.action_items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
