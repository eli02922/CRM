# CRM Platform

A full-stack Customer Relationship Management (CRM) system for managing leads, customer accounts, sales opportunities, and support cases.

**Stack:** Node.js, Express.js, React.js (Vite), PostgreSQL

## Features

- Lead, customer, opportunity, activity, and reporting REST APIs
- JWT authentication with role-based authorization (`admin`, `sales`, `support`)
- Sales pipeline management (Kanban-style opportunity stages)
- Customer interaction tracking (activities/timeline)
- Automated task reminders (due-date based tasks/notifications)
- Analytics dashboards: lead conversion, sales performance, customer engagement, revenue
- API optimization: pagination, database indexing, selective column queries
- CI pipeline (GitHub Actions) running lint + tests for backend and frontend

## Project Structure

```
CRM/
├── backend/          # Express REST API + PostgreSQL
│   ├── src/
│   │   ├── config/       # DB pool, env config
│   │   ├── db/           # schema.sql, seed.sql, migrate.js
│   │   ├── middleware/   # auth, role, error handler, pagination
│   │   ├── modules/      # auth, leads, customers, opportunities, activities, reports
│   │   ├── utils/
│   │   └── app.js / server.js
│   └── tests/
├── frontend/         # React (Vite) SPA
│   └── src/
│       ├── api/
│       ├── auth/
│       ├── components/
│       ├── pages/
│       └── App.jsx
└── .github/workflows/ci.yml
```

## Getting Started

### 1. Database

```bash
createdb crm
```

### 2. Backend

```bash
cd backend
cp .env.example .env      # set DATABASE_URL, JWT secrets
npm install
npm run migrate           # creates tables + indexes
node src/db/seed.js       # optional demo data
npm run dev                # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

Default seeded users (see `backend/src/db/seed.js`): `admin@crm.test`, `sales@crm.test`, `support@crm.test` (password: `Password123!`).
