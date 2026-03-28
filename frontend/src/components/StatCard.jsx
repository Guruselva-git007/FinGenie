import React from 'react';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export default function StatCard({ label, value, tone = 'neutral', caption }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <p className="stat-label">{label}</p>
      <h3 className="stat-value">{currency.format(value || 0)}</h3>
      {caption && <p className="stat-meta">{caption}</p>}
    </div>
  );
}
