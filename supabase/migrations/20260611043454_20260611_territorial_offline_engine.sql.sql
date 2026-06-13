-- Territorial Offline Engine Tables
-- Offline queue, sync log, and device registry

-- Offline Queue: stores pending offline operations
CREATE TABLE IF NOT EXISTS territorial_offline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  
  -- Operation details
  operation_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(255),
  
  -- Parent reference (for hierarchical operations)
  parent_id UUID REFERENCES territorial_offline_queue(id) ON DELETE CASCADE,
  
  -- Payload stored as JSONB
  payload JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending',
  sync_attempts INTEGER DEFAULT 0,
  last_sync_attempt TIMESTAMPTZ,
  sync_error TEXT,
  
  -- Conflict resolution
  conflict_data JSONB,
  resolution_strategy VARCHAR(50),
  
  -- Priority and timestamps
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offline_queue_org_user ON territorial_offline_queue(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON territorial_offline_queue(status);
CREATE INDEX IF NOT EXISTS idx_offline_queue_device ON territorial_offline_queue(device_id);
CREATE INDEX IF NOT EXISTS idx_offline_queue_type ON territorial_offline_queue(operation_type);
CREATE INDEX IF NOT EXISTS idx_offline_queue_created ON territorial_offline_queue(created_at DESC);

-- Sync Log: tracks all sync operations
CREATE TABLE IF NOT EXISTS territorial_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  
  -- Sync details
  sync_type VARCHAR(50) NOT NULL,
  sync_direction VARCHAR(50) NOT NULL,
  
  -- Items processed
  items_total INTEGER DEFAULT 0,
  items_synced INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  items_conflicted INTEGER DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Network info
  connection_type VARCHAR(50),
  network_quality VARCHAR(50),
  
  -- Result
  success BOOLEAN DEFAULT false,
  error_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_log_org_user ON territorial_sync_log(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_device ON territorial_sync_log(device_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_started ON territorial_sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_success ON territorial_sync_log(success);

-- Device Registry: tracks devices for offline operations
CREATE TABLE IF NOT EXISTS territorial_device_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  -- Device identification
  device_id VARCHAR(255) NOT NULL UNIQUE,
  device_name VARCHAR(255),
  device_type VARCHAR(50) DEFAULT 'mobile',
  platform VARCHAR(50),
  os_version VARCHAR(50),
  app_version VARCHAR(50),
  
  -- Capabilities
  has_gps BOOLEAN DEFAULT true,
  has_camera BOOLEAN DEFAULT true,
  has_storage BOOLEAN DEFAULT true,
  storage_available_mb INTEGER,
  
  -- Registration status
  is_registered BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  first_registered_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  
  -- Stats
  total_syncs INTEGER DEFAULT 0,
  total_submissions_offline INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_registry_org ON territorial_device_registry(organization_id);
CREATE INDEX IF NOT EXISTS idx_device_registry_user ON territorial_device_registry(user_id);
CREATE INDEX IF NOT EXISTS idx_device_registry_device ON territorial_device_registry(device_id);
CREATE INDEX IF NOT EXISTS idx_device_registry_active ON territorial_device_registry(is_active);

-- RLS Policies
ALTER TABLE territorial_offline_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_device_registry ENABLE ROW LEVEL SECURITY;

-- Offline Queue Policies
CREATE POLICY "select_own_offline_queue" ON territorial_offline_queue
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_offline_queue" ON territorial_offline_queue
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_offline_queue" ON territorial_offline_queue
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_offline_queue" ON territorial_offline_queue
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Sync Log Policies
CREATE POLICY "select_own_sync_log" ON territorial_sync_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_sync_log" ON territorial_sync_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_sync_log" ON territorial_sync_log
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Device Registry Policies
CREATE POLICY "select_own_devices" ON territorial_device_registry
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_devices" ON territorial_device_registry
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_devices" ON territorial_device_registry
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_devices" ON territorial_device_registry
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
