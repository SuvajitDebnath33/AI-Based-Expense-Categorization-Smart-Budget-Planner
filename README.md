# AI-Based Expense Categorization Smart Budget Planner

Full-stack personal finance workspace with transaction ingestion, ML-assisted categorization, per-user budgets, savings goals, alerts, and analytics.

## Stack

- Backend: FastAPI, SQLAlchemy, Alembic, PostgreSQL
- Frontend: React, TypeScript, Vite, Tailwind CSS
- ML: scikit-learn text classification with fallback logic for newer Python versions
- Auth: JWT-based registration and login

## Features

- Register and log in with isolated user data
- Upload CSV transactions or add them manually
- Predict categories from transaction text and amount
- Override categories and submit correction feedback
- Track budgets, savings goals, and notifications
- Review analytics, trends, forecasts, alerts, and financial health

## Project Structure

```text
.
|-- backend/
|   |-- app/
|   |-- alembic/
|   |-- requirements.txt
|   `-- Dockerfile
|-- frontend/
|   |-- src/
|   |-- package.json
|   `-- Dockerfile
|-- docker-compose.yml
|-- schema.sql
`-- sample_transactions.csv
```

## Prerequisites

- Docker Desktop, if using containers
- Or:
  - Python 3.12 or 3.13 recommended
  - Node.js 20+
  - PostgreSQL 16+

## Environment Files

Create local env files from the examples:

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Important defaults:

- Backend API: `http://localhost:8001/api`
- Frontend app: `http://localhost:5173`
- PostgreSQL: `localhost:5432`
- `AUTH_REQUIRED=false` by default for local development

Set `AUTH_REQUIRED=true` and replace `JWT_SECRET_KEY` before production use.

## Quick Start With Docker

```powershell
docker compose up --build
```

Services:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8001`
- API base: `http://localhost:8001/api`
- PostgreSQL: `localhost:5432`

Stop the stack:

```powershell
docker compose down
```

Reset containers and the database volume:

```powershell
docker compose down -v
```

## Local Development

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
python app/ml/train_model.py
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### Frontend

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

## Database and Migrations

Apply migrations after pulling schema changes:

```powershell
cd backend
alembic upgrade head
```

Current migration chain:

- `20260228_01_init`
- `20260301_02_advanced_features`
- `20260309_03_feedback_and_ml`
- `20260309_04_users_and_auth`

## Authentication Notes

- Registration: `POST /api/auth/register`
- Login: `POST /api/auth/login`
- Current user: `GET /api/auth/me`

The frontend uses JWT auth and stores the bearer token in `localStorage`.

## Main API Routes

Transactions and ingestion:

- `POST /api/upload`
- `POST /api/upload-csv`
- `POST /api/transactions`
- `GET /api/transactions`
- `PATCH /api/transactions/{transaction_id}/override`

Auth and intelligence:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/ai/predict-category`
- `POST /api/ai/retrain-model`
- `POST /api/categorize`
- `POST /api/feedback`
- `GET /api/budget-insights`

Analytics and insights:

- `GET /api/analytics`
- `GET /api/analytics/summary`
- `GET /api/analytics/categories`
- `GET /api/analytics/monthly-trend`
- `GET /api/analytics/monthly-summary`
- `GET /api/analytics/category-distribution`
- `GET /api/analytics/income-vs-expense`
- `GET /api/analytics/savings-rate`
- `GET /api/analytics/forecast`
- `GET /api/forecast`
- `GET /api/alerts`
- `GET /api/financial-health-score`
- `GET /api/ai-summary`
- `GET /api/budget/recommendations`

Budgets, goals, and notifications:

- `POST /api/budgets`
- `GET /api/budgets`
- `GET /api/budgets/{budget_id}`
- `PATCH /api/budgets/{budget_id}`
- `DELETE /api/budgets/{budget_id}`
- `POST /api/savings-goals`
- `GET /api/savings-goals`
- `PATCH /api/savings-goals/{goal_id}/progress`
- `DELETE /api/savings-goals/{goal_id}`
- `GET /api/notifications`
- `PATCH /api/notifications/{notification_id}`

## Sample Data

Use `sample_transactions.csv` to test uploads quickly from the UI or API.

Expected CSV headers:

- `Date`
- `Description`
- `Amount`

## Notes

- `schema.sql` is included as a schema reference, but Alembic migrations are the source of truth for actual database setup.
- On Python 3.14+, some scientific packages may be unavailable; retraining falls back to the in-project logic where applicable.
- The backend root route `GET /` returns a simple service status message.
navailable (common on Python 3.14), retraining now falls back to a built-in Naive Bayes text model and still works.
- For best model quality, Python 3.12/3.13 with scikit-learn is still recommended.
