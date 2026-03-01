# FinGenie

FinGenie is an AI-powered personal finance manager with a React dashboard, FastAPI backend, MySQL storage, and ML services using scikit-learn + TensorFlow.

## Features
- Expense tracking (income + expense transactions)
- Automatic expense categorization with ML classifier (scikit-learn)
- LSTM-based spending prediction (TensorFlow)
- Smart budgeting system with category caps and 50/30/20 guidance
- AI financial advisor endpoint with actionable recommendations
- Powerful Genie Assistant for chat-based automations:
  - task creation and status tracking
  - user customization and preference management
  - feedback and suggestions intake
  - donation pledges and recurring donation planning
- AI/ML/DL finance enhancement layer:
  - ML anomaly detection for unusual expenses (Isolation Forest)
  - recurring expense automation detection
  - subscription optimization opportunities + bill calendar
  - envelope/jars budgeting recommendation engine
  - behavioral finance nudges for habit improvement
  - ML net-savings prediction (Random Forest)
  - DL net-savings prediction (LSTM, with fallback)
  - budget optimization engine for target savings rate
  - finance calculators: EMI, SIP, goal planner, retirement corpus
  - advanced calculators: debt payoff strategies, tax set-aside, emergency fund runway, net-worth projection
- Analytics dashboard with charts, insights, and financial health score

## Tech Stack
- Frontend: React + Vite + Recharts
- Backend: FastAPI + SQLAlchemy
- Database: MySQL
- ML: scikit-learn, TensorFlow

## API Overview
- `POST /api/transactions` add transaction (auto category if omitted)
- `GET /api/transactions` list transactions
- `POST /api/budgets` create/update monthly budget by category
- `GET /api/budgets` list budgets
- `GET /api/budgets/smart-plan` AI budget recommendations
- `GET /api/analytics/summary` analytics payload for dashboard
- `GET /api/analytics/health-score` financial health score breakdown
- `POST /api/advisor/query` ask the AI advisor
- `POST /api/assistant/chat` run AI assistant (can execute automations from chat)
- `GET|PUT /api/assistant/preferences` customization + preferences
- `GET|POST|PATCH /api/assistant/tasks` automation task operations
- `GET|POST /api/assistant/feedback` feedback + suggestions intake
- `GET|POST /api/assistant/donations` donation pledge tracking
- `GET /api/automation/insights` run AI/ML/DL automation insights
- `POST /api/automation/calculate/loan-emi` EMI calculator
- `POST /api/automation/calculate/sip` SIP projection
- `POST /api/automation/calculate/goal-plan` goal planner
- `POST /api/automation/calculate/retirement` retirement corpus estimator
- `POST /api/automation/calculate/debt-payoff` debt avalanche/snowball simulator
- `POST /api/automation/calculate/tax-setaside` tax reserve estimator
- `POST /api/automation/calculate/emergency-fund` emergency fund runway estimator
- `POST /api/automation/calculate/networth-projection` net-worth projection engine
- `POST /api/demo/seed` load demo data

## Run with Docker
1. `docker compose up --build`
2. Backend: `http://localhost:8000`
3. Frontend: `http://localhost:5173`
4. API docs: `http://localhost:8000/docs`

## Run Locally (Single Terminal)
1. Ensure MySQL is running on `127.0.0.1:3306`
2. Start app in one terminal:
   - `MYSQL_PASSWORD='your-mysql-password' ./scripts/run_local.sh`
3. Frontend: `http://localhost:5173`
4. Backend docs: `http://localhost:8000/docs`

## Manual Run Locally
### Backend
1. `cd backend`
2. `python3 -m venv --system-site-packages .venv && source .venv/bin/activate`
3. `pip install -r requirements.txt`
4. Copy `.env.example` to `.env` and update values if needed
5. `uvicorn app.main:app --reload --port 8000`

### Frontend
1. `cd frontend`
2. `npm install`
3. Copy `.env.example` to `.env`
4. `npm run dev`

## Notes
- `Base.metadata.create_all` initializes DB tables on app startup.
- The classifier model is trained automatically on first run and saved under `backend/app/ml/artifacts/`.
- Internet datasets are downloaded into `backend/app/ml/datasets/` by `./scripts/import_datasets.sh`:
  - Merchant Category Code taxonomy (`mcc_codes.csv`)
  - US CPI macro series (`us_cpi.csv`)
- MySQL setup script uses TCP and supports special-character passwords via environment variables.
- LSTM forecast falls back to moving-average when historical data is not enough.
- On Python 3.13+, TensorFlow may be unavailable; FinGenie still runs with automatic moving-average fallback forecasting.

## Feature Inspiration Sources
- [YNAB](https://www.ynab.com/) for envelope-style budgeting and intentional spending workflow.
- [Goodbudget](https://goodbudget.com/) for envelope budgeting structure.
- [Monzo](https://monzo.com/) for pots/jars style goal buckets and simple UX patterns.
- [Rocket Money](https://www.rocketmoney.com/) for subscription review/cancellation inspiration.
- [Monarch Money](https://www.monarchmoney.com/) for recurring transaction awareness and planning.
- [Copilot Money](https://copilot.money/) for net-worth and habit-driven financial workflows.
