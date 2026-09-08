-- V2 migration: HubSpot integration + CV upload support

ALTER TABLE customers ADD COLUMN IF NOT EXISTS hubspot_id VARCHAR(50) UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cv_file_path TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cv_original_name VARCHAR(255);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS hubspot_id VARCHAR(50) UNIQUE;

ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS hubspot_id VARCHAR(50) UNIQUE;

CREATE TABLE IF NOT EXISTS hubspot_sync_log (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type    VARCHAR(50) NOT NULL,
    status       VARCHAR(20) NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
    records_synced INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    synced_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hubspot_sync_log_type ON hubspot_sync_log(sync_type);
CREATE INDEX IF NOT EXISTS idx_hubspot_sync_log_created ON hubspot_sync_log(created_at DESC);
