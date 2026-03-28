import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState, useTransition } from 'react';

import api from './api/client';
import FloatingAssistant from './components/FloatingAssistant';
import HomeOverview from './components/HomeOverview';
import LoginPage from './components/LoginPage';
import TransactionForm from './components/TransactionForm';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const SESSION_STORAGE_KEY = 'fingenie_access_session_v1';

const loadAssistantHub = () => import('./components/AssistantHub');
const loadAutomationLab = () => import('./components/AutomationLab');
const loadChartsPanel = () => import('./components/ChartsPanel');
const loadPlannerHub = () => import('./components/PlannerHub');
const loadProfilePage = () => import('./components/ProfilePage');
const loadSettingsPage = () => import('./components/SettingsPage');
const loadTransactionTable = () => import('./components/TransactionTable');

const AssistantHub = lazy(loadAssistantHub);
const AutomationLab = lazy(loadAutomationLab);
const ChartsPanel = lazy(loadChartsPanel);
const PlannerHub = lazy(loadPlannerHub);
const ProfilePage = lazy(loadProfilePage);
const SettingsPage = lazy(loadSettingsPage);
const TransactionTable = lazy(loadTransactionTable);

const sections = [
  { key: 'home', label: 'Overview', icon: 'OV' },
  { key: 'plan', label: 'Planner', icon: 'PL' },
  { key: 'intelligence', label: 'Intelligence', icon: 'IN' },
  { key: 'transactions', label: 'Transactions', icon: 'TX' },
  { key: 'assistant', label: 'Assistant', icon: 'AI' },
  { key: 'profile', label: 'Profile', icon: 'PR' },
  { key: 'settings', label: 'Settings', icon: 'ST' },
];

function resolveError(err, fallback) {
  return err?.response?.data?.detail || err.message || fallback;
}

function preloadSection(sectionKey) {
  switch (sectionKey) {
    case 'plan':
      return loadPlannerHub();
    case 'intelligence':
      return Promise.all([loadChartsPanel(), loadAutomationLab()]);
    case 'transactions':
      return loadTransactionTable();
    case 'assistant':
      return loadAssistantHub();
    case 'profile':
      return loadProfilePage();
    case 'settings':
      return loadSettingsPage();
    default:
      return Promise.resolve();
  }
}

function readStoredSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.accessToken ? parsed : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState(readStoredSession);
  const [activeSection, setActiveSection] = useState('home');
  const [dashboard, setDashboard] = useState(null);
  const [automationInsights, setAutomationInsights] = useState(null);

  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsLoaded, setInsightsLoaded] = useState(false);

  const [submittingTx, setSubmittingTx] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [savingPlanning, setSavingPlanning] = useState(false);
  const [error, setError] = useState('');

  const [isSectionPending, startSectionTransition] = useTransition();

  const activeMeta = useMemo(() => sections.find((section) => section.key === activeSection) || sections[0], [activeSection]);

  const summary = dashboard?.summary || null;
  const transactions = dashboard?.recent_transactions || [];
  const budgets = dashboard?.budgets || [];
  const smartPlan = dashboard?.smart_plan || null;
  const goals = dashboard?.goals || [];
  const goalsSummary = dashboard?.goals_summary || null;
  const netWorth = dashboard?.net_worth || { accounts: [], summary: null };
  const recurringExpenses = dashboard?.recurring_expenses || [];
  const billCalendar = dashboard?.bill_calendar || [];
  const subscriptionOpportunities = dashboard?.subscription_opportunities || [];
  const transactionTrackRecord = dashboard?.transaction_track_record || null;
  const health = summary?.financial_health;

  const persistSession = useCallback((nextSession) => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!nextSession) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
  }, []);

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!session) {
      return;
    }

    if (!silent) {
      setLoadingDashboard(true);
    }
    setError('');
    try {
      const response = await api.get('/dashboard/overview?forecast_months=4&tx_limit=120');
      setDashboard(response.data);
    } catch (err) {
      setError(resolveError(err, 'Unable to load FinGenie workspace.'));
    } finally {
      if (!silent) {
        setLoadingDashboard(false);
      }
    }
  }, [session]);

  const loadInsights = useCallback(async ({ silent = false } = {}) => {
    if (!session) {
      return;
    }

    if (!silent) {
      setLoadingInsights(true);
    }
    setError('');
    try {
      const response = await api.get('/automation/insights?forecast_months=4');
      setAutomationInsights(response.data);
      setInsightsLoaded(true);
    } catch (err) {
      setError(resolveError(err, 'Unable to load intelligence workspace.'));
    } finally {
      if (!silent) {
        setLoadingInsights(false);
      }
    }
  }, [session]);

  const syncSessionProfile = useCallback(async (nextSession) => {
    if (!nextSession?.accessToken) {
      return;
    }

    try {
      const { data } = await api.get('/assistant/profile');
      const email = nextSession.email || data.email;
      const username = nextSession.username || email.split('@')[0] || data.username;
      await api.put('/assistant/profile', {
        ...data,
        full_name: nextSession.fullName || data.full_name,
        email,
        username,
      });
    } catch (err) {
      setError(resolveError(err, 'Unable to sync profile session details.'));
    }
  }, []);

  useEffect(() => {
    persistSession(session);
  }, [persistSession, session]);

  useEffect(() => {
    if (!session) {
      setDashboard(null);
      setAutomationInsights(null);
      setInsightsLoaded(false);
      setLoadingDashboard(false);
      return;
    }

    loadDashboard();
  }, [loadDashboard, session]);

  useEffect(() => {
    if (!session) {
      return;
    }
    syncSessionProfile(session);
  }, [session, syncSessionProfile]);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (activeSection === 'intelligence' && !insightsLoaded && !loadingInsights) {
      loadInsights();
    }
  }, [activeSection, insightsLoaded, loadingInsights, loadInsights, session]);

  useEffect(() => {
    if (!session || typeof window === 'undefined') {
      return undefined;
    }

    const warmSections = () => {
      preloadSection('plan');
      preloadSection('transactions');
      preloadSection('profile');
      preloadSection('assistant');
    };

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(warmSections, { timeout: 1200 });
      return () => window.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(warmSections, 700);
    return () => window.clearTimeout(timeoutId);
  }, [session]);

  const refreshVisibleData = useCallback(async () => {
    if (!session) {
      return;
    }

    await Promise.all([
      loadDashboard({ silent: true }),
      insightsLoaded ? loadInsights({ silent: true }) : Promise.resolve(),
    ]);
  }, [insightsLoaded, loadDashboard, loadInsights, session]);

  const submitTransaction = async (payload) => {
    setSubmittingTx(true);
    setError('');
    try {
      await api.post('/transactions', payload);
      await refreshVisibleData();
    } catch (err) {
      setError(resolveError(err, 'Failed to add transaction.'));
    } finally {
      setSubmittingTx(false);
    }
  };

  const saveBudget = async (payload) => {
    setSavingBudget(true);
    setError('');
    try {
      await api.post('/budgets', payload);
      await refreshVisibleData();
    } catch (err) {
      setError(resolveError(err, 'Failed to save budget.'));
    } finally {
      setSavingBudget(false);
    }
  };

  const createGoal = async (payload) => {
    setSavingPlanning(true);
    setError('');
    try {
      await api.post('/planning/goals', payload);
      await loadDashboard({ silent: true });
    } catch (err) {
      setError(resolveError(err, 'Failed to create goal.'));
    } finally {
      setSavingPlanning(false);
    }
  };

  const updateGoal = async (goalId, payload) => {
    setSavingPlanning(true);
    setError('');
    try {
      await api.patch(`/planning/goals/${goalId}`, payload);
      await loadDashboard({ silent: true });
    } catch (err) {
      setError(resolveError(err, 'Failed to update goal.'));
    } finally {
      setSavingPlanning(false);
    }
  };

  const deleteGoal = async (goalId) => {
    setSavingPlanning(true);
    setError('');
    try {
      await api.delete(`/planning/goals/${goalId}`);
      await loadDashboard({ silent: true });
    } catch (err) {
      setError(resolveError(err, 'Failed to delete goal.'));
    } finally {
      setSavingPlanning(false);
    }
  };

  const createAccount = async (payload) => {
    setSavingPlanning(true);
    setError('');
    try {
      await api.post('/planning/accounts', payload);
      await loadDashboard({ silent: true });
    } catch (err) {
      setError(resolveError(err, 'Failed to add account.'));
    } finally {
      setSavingPlanning(false);
    }
  };

  const updateAccount = async (accountId, payload) => {
    setSavingPlanning(true);
    setError('');
    try {
      await api.patch(`/planning/accounts/${accountId}`, payload);
      await loadDashboard({ silent: true });
    } catch (err) {
      setError(resolveError(err, 'Failed to update account.'));
    } finally {
      setSavingPlanning(false);
    }
  };

  const deleteAccount = async (accountId) => {
    setSavingPlanning(true);
    setError('');
    try {
      await api.delete(`/planning/accounts/${accountId}`);
      await loadDashboard({ silent: true });
    } catch (err) {
      setError(resolveError(err, 'Failed to remove account.'));
    } finally {
      setSavingPlanning(false);
    }
  };

  const seedDemo = async () => {
    setError('');
    try {
      await api.post('/demo/seed');
      await refreshVisibleData();
    } catch (err) {
      setError(resolveError(err, 'Unable to seed demo data.'));
    }
  };

  const handleSectionChange = (nextSection) => {
    preloadSection(nextSection);
    startSectionTransition(() => {
      setActiveSection(nextSection);
    });
  };

  const handleAccessGranted = (nextSession) => {
    setSession(nextSession);
    setError('');
    setActiveSection('home');
  };

  const handleLogout = () => {
    setSession(null);
    setError('');
    setDashboard(null);
    setAutomationInsights(null);
    setInsightsLoaded(false);
    setActiveSection('home');
  };

  const sectionFallback = (
    <section className="panel">
      <h3>Loading section...</h3>
      <p className="muted">Preparing this workspace.</p>
    </section>
  );

  const renderSection = () => {
    if (!dashboard && loadingDashboard) {
      return (
        <section className="panel">
          <h3>Loading workspace...</h3>
          <p className="muted">Pulling together your latest finance view.</p>
        </section>
      );
    }

    switch (activeSection) {
      case 'home':
        return (
          <HomeOverview
            summary={summary}
            health={health}
            transactions={transactions}
            goals={goals}
            goalsSummary={goalsSummary}
            netWorth={netWorth}
            billCalendar={billCalendar}
            subscriptionOpportunities={subscriptionOpportunities}
            onOpenSection={handleSectionChange}
            quickTransactionForm={<TransactionForm onSubmit={submitTransaction} submitting={submittingTx} compact />}
          />
        );
      case 'plan':
        return (
          <Suspense fallback={sectionFallback}>
            <PlannerHub
              budgets={budgets}
              smartPlan={smartPlan}
              goals={goals}
              goalsSummary={goalsSummary}
              netWorth={netWorth}
              billCalendar={billCalendar}
              recurringExpenses={recurringExpenses}
              subscriptionOpportunities={subscriptionOpportunities}
              onSaveBudget={saveBudget}
              onCreateGoal={createGoal}
              onUpdateGoal={updateGoal}
              onDeleteGoal={deleteGoal}
              onCreateAccount={createAccount}
              onUpdateAccount={updateAccount}
              onDeleteAccount={deleteAccount}
              savingBudget={savingBudget}
              savingPlanning={savingPlanning}
            />
          </Suspense>
        );
      case 'intelligence':
        return (
          <Suspense fallback={sectionFallback}>
            <div className="section-stack">
              <section className="panel">
                <ChartsPanel summary={summary} />
              </section>
              <section className="panel">
                <AutomationLab
                  insights={automationInsights}
                  loading={loadingInsights}
                  onRefresh={() => loadInsights()}
                  onError={setError}
                />
              </section>
            </div>
          </Suspense>
        );
      case 'transactions':
        return (
          <div className="workspace-columns workspace-columns-wide">
            <section className="panel panel-sticky">
              <TransactionForm onSubmit={submitTransaction} submitting={submittingTx} />
            </section>
            <Suspense fallback={sectionFallback}>
              <section className="panel">
                <TransactionTable transactions={transactions} trackRecord={transactionTrackRecord} />
              </section>
            </Suspense>
          </div>
        );
      case 'assistant':
        return (
          <Suspense fallback={sectionFallback}>
            <section className="panel">
              <AssistantHub onError={setError} onDataMutation={refreshVisibleData} />
            </section>
          </Suspense>
        );
      case 'profile':
        return (
          <Suspense fallback={sectionFallback}>
            <ProfilePage session={session} onError={setError} />
          </Suspense>
        );
      case 'settings':
        return (
          <Suspense fallback={sectionFallback}>
            <SettingsPage onError={setError} session={session} />
          </Suspense>
        );
      default:
        return null;
    }
  };

  const activeGoalCount = goalsSummary?.active_goals || 0;
  const netWorthValue = netWorth?.summary?.net_worth || 0;

  if (!session) {
    return <LoginPage onAccessGranted={handleAccessGranted} error={error} />;
  }

  return (
    <div className="app-shell sectioned-shell">
      <header className="topbar app-topbar panel app-header">
        <div>
          <p className="eyebrow">Personal Finance</p>
          <h1>FinGenie</h1>
          <p className="topbar-copy">Clean money workspace with account views, reports, and live support.</p>
        </div>
        <div className="header-actions">
          <span className="chip chip-soft">{session.mode === 'guest' ? 'Guest mode' : session.fullName}</span>
          <button className="secondary" onClick={seedDemo}>Load Demo Data</button>
          <button className="secondary" onClick={refreshVisibleData}>Refresh</button>
          <button className="ghost" onClick={handleLogout}>Log Out</button>
        </div>
      </header>

      <section className="summary-strip">
        <div className="summary-chip">
          <span className="muted">Health</span>
          <strong>{health?.score ?? 0}/100</strong>
        </div>
        <div className="summary-chip">
          <span className="muted">Goals</span>
          <strong>{activeGoalCount}</strong>
        </div>
        <div className="summary-chip">
          <span className="muted">Bills</span>
          <strong>{billCalendar.length}</strong>
        </div>
        <div className="summary-chip">
          <span className="muted">Net worth</span>
          <strong>{currency.format(netWorthValue || 0)}</strong>
        </div>
      </section>

      <nav className="minimal-nav" aria-label="App Sections">
        {sections.map((section) => (
          <button
            key={section.key}
            className={`minimal-nav-item ${activeSection === section.key ? 'active' : ''}`}
            onClick={() => handleSectionChange(section.key)}
            onMouseEnter={() => preloadSection(section.key)}
            onFocus={() => preloadSection(section.key)}
            aria-current={activeSection === section.key ? 'page' : undefined}
          >
            <span className="section-tab-icon">{section.icon}</span>
            <span>{section.label}</span>
          </button>
        ))}
      </nav>

      <section className="page-caption">
        <div>
          <h2>{activeMeta.label}</h2>
        </div>
        <div className="hero-tags">
          {isSectionPending && <span className="chip">Switching</span>}
          <span className="chip chip-soft">{subscriptionOpportunities.length} subscriptions</span>
          <span className="chip chip-soft">{goalsSummary?.completion_pct ?? 0}% funded</span>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}

      <main className="section-main">{renderSection()}</main>
      <FloatingAssistant onError={setError} onDataMutation={refreshVisibleData} />
    </div>
  );
}
