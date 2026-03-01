import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function shortMonth(value) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default function ChartsPanel({ summary }) {
  if (!summary) return <p className="muted">Loading dashboard...</p>;

  return (
    <div className="charts-grid">
      <div className="chart-card">
        <h4>Expense by Category</h4>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={summary.expense_by_category} dataKey="amount" nameKey="category" outerRadius={80} fill="#1f6feb" />
            <Tooltip formatter={(value) => currency.format(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h4>Monthly Trend</h4>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={summary.monthly_expense_trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tickFormatter={shortMonth} />
            <YAxis />
            <Tooltip formatter={(value) => currency.format(value)} labelFormatter={shortMonth} />
            <Line type="monotone" dataKey="expense" stroke="#f97316" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h4>LSTM Spending Forecast</h4>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={summary.spending_forecast}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tickFormatter={shortMonth} />
            <YAxis />
            <Tooltip formatter={(value) => currency.format(value)} labelFormatter={shortMonth} />
            <Line type="monotone" dataKey="predicted_spending" stroke="#1d4ed8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h4>Budget Utilization</h4>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={summary.budget_utilization}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip formatter={(value) => `${Number(value).toFixed(0)}%`} />
            <Bar dataKey="utilization_pct" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
