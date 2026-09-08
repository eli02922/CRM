-- V3 migration: generic multi-vendor integration sync log.
CREATE TABLE IF NOT EXISTS vendor_sync_log (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor         VARCHAR(50) NOT NULL,
    sync_type      VARCHAR(50) NOT NULL,
    status         VARCHAR(20) NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
    records_synced INTEGER NOT NULL DEFAULT 0,
    error_message  TEXT,
    synced_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendor_sync_log_vendor ON vendor_sync_log(vendor);
CREATE INDEX IF NOT EXISTS idx_vendor_sync_log_created ON vendor_sync_log(created_at DESC);
