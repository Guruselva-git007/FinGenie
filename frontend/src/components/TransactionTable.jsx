import React from 'react';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function TransactionTable({ transactions }) {
  return (
    <div>
      <h3>Recent Transactions</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">No transactions yet.</td>
              </tr>
            )}
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td>{tx.transaction_date}</td>
                <td>{tx.description}</td>
                <td>{tx.category}</td>
                <td>{tx.kind}</td>
                <td className={tx.kind === 'expense' ? 'expense' : 'income'}>{currency.format(tx.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
