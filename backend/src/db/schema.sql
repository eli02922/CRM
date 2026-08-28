-- CRM database schema
-- Indexes are added on foreign keys and frequently filtered/sorted columns
-- to keep list/report queries fast as data grows.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          VARCHAR(20) NOT NULL DEFAULT 'sales' CHECK (role IN ('admin', 'sales', 'support')),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(200) NOT NULL,
    industry     VARCHAR(100),
    email        VARCHAR(255),
    phone        VARCHAR(50),
    address      TEXT,
    website      VARCHAR(255),
    owner_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customers_owner ON customers(owner_id);
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers(company_name);

CREATE TABLE IF NOT EXISTS leads (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name   VARCHAR(100) NOT NULL,
    last_name    VARCHAR(100) NOT NULL,
    email        VARCHAR(255),
    phone        VARCHAR(50),
    company      VARCHAR(200),
    source       VARCHAR(100),
    status       VARCHAR(30) NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new', 'contacted', 'qualified', 'unqualified', 'converted')),
    score        INTEGER NOT NULL DEFAULT 0,
    owner_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    converted_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

CREATE TABLE IF NOT EXISTS opportunities (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(200) NOT NULL,
    customer_id  UUID REFERENCES customers(id) ON DELETE CASCADE,
    lead_id      UUID REFERENCES leads(id) ON DELETE SET NULL,
    stage        VARCHAR(30) NOT NULL DEFAULT 'prospecting'
                 CHECK (stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'won', 'lost')),
    amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
    currency     VARCHAR(10) NOT NULL DEFAULT 'USD',
    probability  SMALLINT NOT NULL DEFAULT 10 CHECK (probability BETWEEN 0 AND 100),
    expected_close_date DATE,
    owner_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer ON opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_owner ON opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_close_date ON opportunities(expected_close_date);

CREATE TABLE IF NOT EXISTS activities (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type          VARCHAR(30) NOT NULL DEFAULT 'note'
                  CHECK (type IN ('call', 'email', 'meeting', 'note', 'task')),
    subject       VARCHAR(200) NOT NULL,
    notes         TEXT,
    due_date      TIMESTAMPTZ,
    completed     BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
    lead_id       UUID REFERENCES leads(id) ON DELETE CASCADE,
    customer_id   UUID REFERENCES customers(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
    owner_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activities_owner ON activities(owner_id);
CREATE INDEX IF NOT EXISTS idx_activities_due_date ON activities(due_date);
CREATE INDEX IF NOT EXISTS idx_activities_customer ON activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_opportunity ON activities(opportunity_id);

CREATE TABLE IF NOT EXISTS support_cases (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject      VARCHAR(200) NOT NULL,
    description  TEXT,
    status       VARCHAR(30) NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority     VARCHAR(20) NOT NULL DEFAULT 'medium'
                 CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    customer_id  UUID REFERENCES customers(id) ON DELETE CASCADE,
    assignee_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_cases_customer ON support_cases(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_cases_status ON support_cases(status);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
