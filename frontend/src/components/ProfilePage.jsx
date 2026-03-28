import React, { useEffect, useMemo, useState } from 'react';

import api from '../api/client';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const emptyBranchForm = {
  name: '',
  branch_code: '',
  manager_name: '',
  notes: '',
};

function normalizeBranchForm(form) {
  return {
    name: form.name.trim(),
    branch_code: form.branch_code.trim(),
    manager_name: form.manager_name.trim(),
    monthly_revenue: 0,
    monthly_expense: 0,
    notes: form.notes?.trim() || null,
  };
}

export default function ProfilePage({ session, onError }) {
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingBranch, setSavingBranch] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [viewMode, setViewMode] = useState('personal');
  const [reportScope, setReportScope] = useState('personal');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [newBranch, setNewBranch] = useState(emptyBranchForm);
  const [branchDrafts, setBranchDrafts] = useState({});

  const loadWorkspace = async () => {
    setLoading(true);
    try {
      const response = await api.get('/profile/overview');
      const data = response.data;
      setWorkspace(data);

      const nextDrafts = {};
      data.branches.forEach((branch) => {
        nextDrafts[branch.id] = {
          ...branch,
          notes: branch.notes || '',
        };
      });
      setBranchDrafts(nextDrafts);

      if (data.branches.length > 0) {
        const initialBranchId = String(data.branches[0].id);
        setSelectedBranchId((current) => current || initialBranchId);
        setViewMode((current) => (current === 'personal' ? (data.branches.length > 1 ? 'combined' : 'single') : current));
        setReportScope((current) => (current === 'personal' ? (data.branches.length > 1 ? 'combined' : 'personal') : current));
      } else {
        setSelectedBranchId('');
      }
    } catch (err) {
      onError(err?.response?.data?.detail || err.message || 'Failed to load profile workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  const branches = workspace?.branches || [];
  const personalAccount = workspace?.personal_account || null;
  const branchSummary = workspace?.branch_summary || null;

  const selectedBranch = useMemo(
    () => branches.find((branch) => String(branch.id) === String(selectedBranchId)) || branches[0] || null,
    [branches, selectedBranchId]
  );

  const saveBranch = async (branchId) => {
    setSavingBranch(true);
    try {
      await api.put(`/profile/branches/${branchId}`, normalizeBranchForm(branchDrafts[branchId]));
      await loadWorkspace();
    } catch (err) {
      onError(err?.response?.data?.detail || err.message || 'Failed to save branch account.');
    } finally {
      setSavingBranch(false);
    }
  };

  const createBranch = async (event) => {
    event.preventDefault();
    if (!newBranch.name.trim()) {
      return;
    }

    setSavingBranch(true);
    try {
      await api.post('/profile/branches', normalizeBranchForm(newBranch));
      setNewBranch(emptyBranchForm);
      await loadWorkspace();
    } catch (err) {
      onError(err?.response?.data?.detail || err.message || 'Failed to create branch account.');
    } finally {
      setSavingBranch(false);
    }
  };

  const deleteBranch = async (branchId) => {
    setSavingBranch(true);
    try {
      await api.delete(`/profile/branches/${branchId}`);
      await loadWorkspace();
    } catch (err) {
      onError(err?.response?.data?.detail || err.message || 'Failed to delete branch account.');
    } finally {
      setSavingBranch(false);
    }
  };

  const generateReport = async () => {
    setReportLoading(true);
    try {
      const params = new URLSearchParams({ scope: reportScope });
      if (reportScope === 'branch' && selectedBranch) {
        params.set('branch_id', selectedBranch.id);
      }
      const response = await api.get(`/profile/report?${params.toString()}`);
      setReport(response.data);
    } catch (err) {
      onError(err?.response?.data?.detail || err.message || 'Failed to generate report.');
    } finally {
      setReportLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) {
      return;
    }

    const blob = new Blob([report.report_text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${report.scope}-report.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <section className="panel">
        <h3>Profile</h3>
        <p className="muted">Loading profile workspace...</p>
      </section>
    );
  }

  return (
    <div className="section-stack profile-page">
      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Profile</p>
            <h3>{workspace?.profile?.full_name || session?.fullName || 'FinGenie User'}</h3>
            <p className="muted">{workspace?.profile?.email || session?.email} • {session?.mode === 'guest' ? 'Guest workspace' : 'Signed-in workspace'}</p>
          </div>
          <div className="hero-tags">
            <span className="chip">{branchSummary?.account_mode === 'combined' ? 'Combined accounts' : 'Single account'}</span>
            <span className="chip chip-soft">{workspace?.profile?.account_tier || 'pro'} tier</span>
          </div>
        </div>

        <div className="profile-summary-grid">
          <div className="track-metric">
            <span className="muted">Username</span>
            <strong>{workspace?.profile?.username || session?.username || 'fingenie_user'}</strong>
            <p>{workspace?.profile?.city || 'No city set'} • {workspace?.profile?.country || 'No country set'}</p>
          </div>
          <div className="track-metric">
            <span className="muted">Primary account cashflow</span>
            <strong>{currency.format(personalAccount?.profit_loss || 0)}</strong>
            <p>{currency.format(personalAccount?.revenue || 0)} income • {currency.format(personalAccount?.expense || 0)} expense</p>
          </div>
          <div className="track-metric">
            <span className="muted">Branch accounts</span>
            <strong>{branchSummary?.branch_count || 0}</strong>
            <p>{branchSummary?.branch_count > 1 ? 'Combined comparison ready' : 'Single-account mode active'}</p>
          </div>
          <div className="track-metric">
            <span className="muted">Health score</span>
            <strong>{personalAccount?.health_score || 0}/100</strong>
            <p>Avg savings {currency.format(personalAccount?.average_monthly_savings || 0)}</p>
          </div>
        </div>
      </section>

      <div className="tab-row" role="tablist" aria-label="Profile views">
        <button type="button" className={`tab-chip ${viewMode === 'personal' ? 'active' : ''}`} onClick={() => setViewMode('personal')}>
          Personal
        </button>
        <button type="button" className={`tab-chip ${viewMode === 'single' ? 'active' : ''}`} onClick={() => setViewMode('single')}>
          Single Account
        </button>
        <button type="button" className={`tab-chip ${viewMode === 'combined' ? 'active' : ''}`} onClick={() => setViewMode('combined')}>
          Combined Accounts
        </button>
        <button type="button" className={`tab-chip ${viewMode === 'reports' ? 'active' : ''}`} onClick={() => setViewMode('reports')}>
          Reports
        </button>
      </div>

      {viewMode === 'personal' && personalAccount && (
        <section className="profile-workspace-grid">
          <div className="track-card">
            <h4>Primary Account Snapshot</h4>
            <div className="goal-mini-grid">
              <div className="kpi-box">
                <p className="muted">Income</p>
                <strong>{currency.format(personalAccount.revenue)}</strong>
              </div>
              <div className="kpi-box">
                <p className="muted">Expense</p>
                <strong>{currency.format(personalAccount.expense)}</strong>
              </div>
              <div className="kpi-box">
                <p className="muted">Profit / Loss</p>
                <strong>{currency.format(personalAccount.profit_loss)}</strong>
              </div>
              <div className="kpi-box">
                <p className="muted">Avg savings</p>
                <strong>{currency.format(personalAccount.average_monthly_savings)}</strong>
              </div>
            </div>
          </div>

          <div className="track-card">
            <h4>Account Context</h4>
            <div className="home-focus-stack">
              <div className="focus-row">
                <div>
                  <strong>Workspace mode</strong>
                  <p className="muted">{session?.mode === 'guest' ? 'Guest access with full exploration enabled.' : 'Signed in with a persistent local session.'}</p>
                </div>
              </div>
              <div className="focus-row">
                <div>
                  <strong>Branch coverage</strong>
                  <p className="muted">{branchSummary?.branch_count > 0 ? `${branchSummary.branch_count} branch account(s) available for comparison.` : 'No branch accounts yet. Add them below for comparison and combined reporting.'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {viewMode === 'single' && (
        <section className="track-card">
          <div className="panel-head">
            <div>
              <h4>Single Account View</h4>
              <p className="muted">Focus on one branch account at a time or fall back to your primary personal account if you only run one account.</p>
            </div>
            {branches.length > 0 && (
              <select value={selectedBranch?.id || ''} onChange={(event) => setSelectedBranchId(event.target.value)}>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedBranch ? (
            <div className="profile-summary-grid">
              <div className="track-metric">
              <span className="muted">Revenue</span>
              <strong>{currency.format(selectedBranch.monthly_revenue)}</strong>
              <p>From branch-tagged income transactions</p>
            </div>
            <div className="track-metric">
              <span className="muted">Expense</span>
              <strong>{currency.format(selectedBranch.monthly_expense)}</strong>
              <p>From branch-tagged expense transactions</p>
            </div>
              <div className="track-metric">
                <span className="muted">Profit / Loss</span>
                <strong className={selectedBranch.profit_loss >= 0 ? 'positive-text' : 'negative-text'}>
                  {currency.format(selectedBranch.profit_loss)}
                </strong>
                <p>{Math.round(selectedBranch.margin_pct * 100)}% margin</p>
              </div>
              <div className="track-metric">
              <span className="muted">Notes</span>
              <strong>{selectedBranch.notes ? 'Branch notes saved' : 'No notes yet'}</strong>
              <p>{selectedBranch.notes || 'Tag transactions to this branch to build live branch performance.'}</p>
            </div>
          </div>
          ) : (
            <p className="muted">No branch accounts added yet. The personal account snapshot above is currently your single-account view.</p>
          )}
        </section>
      )}

      {viewMode === 'combined' && (
        <section className="track-card">
          <div className="panel-head">
            <div>
              <h4>Combined Branch Comparison</h4>
            <p className="muted">Review combined profit or loss across all branch accounts and compare each branch side by side.</p>
          </div>
          </div>

          <div className="profile-summary-grid">
            <div className="track-metric">
              <span className="muted">Combined revenue</span>
              <strong>{currency.format(branchSummary?.combined_revenue || 0)}</strong>
            </div>
            <div className="track-metric">
              <span className="muted">Combined expense</span>
              <strong>{currency.format(branchSummary?.combined_expense || 0)}</strong>
            </div>
            <div className="track-metric">
              <span className="muted">Combined profit / loss</span>
              <strong className={(branchSummary?.combined_profit_loss || 0) >= 0 ? 'positive-text' : 'negative-text'}>
                {currency.format(branchSummary?.combined_profit_loss || 0)}
              </strong>
            </div>
            <div className="track-metric">
              <span className="muted">Best vs weakest</span>
              <strong>{branchSummary?.best_branch_name || 'n/a'}</strong>
              <p>{branchSummary?.weakest_branch_name ? `Watch ${branchSummary.weakest_branch_name}` : 'Add more branches for comparison.'}</p>
            </div>
          </div>

          <div className="branch-list">
            {branches.length === 0 && <p className="muted">No branch accounts yet.</p>}
            {branches.map((branch) => (
              <div className="branch-row" key={branch.id}>
                <div>
                  <strong>{branch.name}</strong>
                  <p className="muted">{branch.manager_name || 'No manager'} • {branch.branch_code || 'No code'}</p>
                </div>
                <div className="branch-row-metrics">
                  <span>{currency.format(branch.monthly_revenue)}</span>
                  <span>{currency.format(branch.monthly_expense)}</span>
                  <strong className={branch.profit_loss >= 0 ? 'positive-text' : 'negative-text'}>
                    {currency.format(branch.profit_loss)}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {viewMode === 'reports' && (
        <section className="track-card">
          <div className="panel-head">
            <div>
              <h4>Report Generation</h4>
              <p className="muted">Generate personal, combined-account, or branch-level reports and download the text version directly.</p>
            </div>
          </div>

          <div className="report-toolbar">
            <select value={reportScope} onChange={(event) => setReportScope(event.target.value)}>
              <option value="personal">personal report</option>
              <option value="combined">combined accounts report</option>
              <option value="branch">single branch report</option>
            </select>

            {reportScope === 'branch' && (
              <select value={selectedBranch?.id || ''} onChange={(event) => setSelectedBranchId(event.target.value)} disabled={branches.length === 0}>
                {branches.length === 0 && <option value="">no branch accounts</option>}
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            )}

            <button type="button" onClick={generateReport} disabled={reportLoading || (reportScope === 'branch' && !selectedBranch)}>
              {reportLoading ? 'Generating...' : 'Generate Report'}
            </button>
            <button type="button" className="secondary" onClick={downloadReport} disabled={!report}>
              Download Text
            </button>
          </div>

          {report && (
            <div className="report-layout">
              <div className="profile-summary-grid">
                {report.metrics.map((metric) => (
                  <div className="track-metric" key={metric.label}>
                    <span className="muted">{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>

              <div className="home-grid">
                <div className="panel">
                  <h4>Highlights</h4>
                  <ul className="insight-list">
                    {report.highlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="panel">
                  <h4>Recommendations</h4>
                  <ul className="insight-list">
                    {report.recommendations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="report-text-block">
                <h4>{report.title}</h4>
                <pre>{report.report_text}</pre>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="track-card">
        <div className="panel-head">
          <div>
            <h4>Branch Accounts</h4>
            <p className="muted">Create branch accounts here, then tag transactions to them. Revenue, expense, and profit or loss are now calculated from tagged transaction history.</p>
          </div>
        </div>

        <form className="branch-form-grid" onSubmit={createBranch}>
          <input value={newBranch.name} onChange={(event) => setNewBranch((prev) => ({ ...prev, name: event.target.value }))} placeholder="Branch name" required />
          <input value={newBranch.branch_code} onChange={(event) => setNewBranch((prev) => ({ ...prev, branch_code: event.target.value }))} placeholder="Branch code" />
          <input value={newBranch.manager_name} onChange={(event) => setNewBranch((prev) => ({ ...prev, manager_name: event.target.value }))} placeholder="Manager name" />
          <input value={newBranch.notes} onChange={(event) => setNewBranch((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Branch notes" />
          <button type="submit" disabled={savingBranch}>{savingBranch ? 'Saving...' : 'Add Branch Account'}</button>
        </form>

        <div className="branch-editor-list">
          {branches.length === 0 && <p className="muted">Add your first branch account to unlock single-vs-combined comparison and branch reporting.</p>}
          {branches.map((branch) => {
            const draft = branchDrafts[branch.id] || {
              ...branch,
              notes: branch.notes || '',
            };

            return (
              <div className="branch-editor-card" key={branch.id}>
                <div className="branch-editor-grid">
                  <input value={draft.name} onChange={(event) => setBranchDrafts((prev) => ({ ...prev, [branch.id]: { ...draft, name: event.target.value } }))} />
                  <input value={draft.branch_code} onChange={(event) => setBranchDrafts((prev) => ({ ...prev, [branch.id]: { ...draft, branch_code: event.target.value } }))} />
                  <input value={draft.manager_name} onChange={(event) => setBranchDrafts((prev) => ({ ...prev, [branch.id]: { ...draft, manager_name: event.target.value } }))} />
                  <input value={draft.notes} onChange={(event) => setBranchDrafts((prev) => ({ ...prev, [branch.id]: { ...draft, notes: event.target.value } }))} />
                </div>

                <div className="row-actions">
                  <span className={`status-pill ${branch.profit_loss >= 0 ? 'status-on_track' : 'status-critical'}`}>
                    {currency.format(branch.profit_loss)}
                  </span>
                  <div className="hero-tags">
                    <button type="button" className="secondary" onClick={() => saveBranch(branch.id)} disabled={savingBranch}>
                      Save
                    </button>
                    <button type="button" className="ghost" onClick={() => deleteBranch(branch.id)} disabled={savingBranch}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
