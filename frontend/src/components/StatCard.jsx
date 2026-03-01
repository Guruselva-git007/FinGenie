import React from 'react';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export default function StatCard({ label, value, tone = 'neutral' }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <p className="stat-label">{label}</p>
      <h3 className="stat-value">{currency.format(value || 0)}</h3>
    </div>
  );
}
