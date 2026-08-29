-- 郑州东站应急疏散高保真仿真系统
-- PostgreSQL 15+ / TimescaleDB 2.x，可重复执行的基础结构

CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS emergency_sim;
SET search_path TO emergency_sim, public;

CREATE TABLE IF NOT EXISTS schema_version (
  version varchar(32) PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now(),
  checksum varchar(128) NOT NULL,
  description text NOT NULL
);

CREATE TABLE IF NOT EXISTS scenario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_code varchar(64) NOT NULL UNIQUE,
  name varchar(200) NOT NULL,
  source_script varchar(500) NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  config_version varchar(32) NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS region (
  id varchar(80) PRIMARY KEY,
  scenario_id uuid NOT NULL REFERENCES scenario(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  floor smallint NOT NULL CHECK (floor BETWEEN 1 AND 3),
  capacity integer NOT NULL CHECK (capacity > 0),
  boundary jsonb NOT NULL,
  coordinate_system varchar(64) NOT NULL,
  UNIQUE (scenario_id, name)
);

CREATE TABLE IF NOT EXISTS device (
  id varchar(80) PRIMARY KEY,
  scenario_id uuid NOT NULL REFERENCES scenario(id) ON DELETE CASCADE,
  type varchar(32) NOT NULL CHECK (type IN ('gate','broadcast','display','door','sign')),
  name varchar(160) NOT NULL,
  floor smallint NOT NULL CHECK (floor BETWEEN 1 AND 3),
  position jsonb NOT NULL,
  default_status varchar(48) NOT NULL,
  state_machine jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS evacuation_path (
  id varchar(80) PRIMARY KEY,
  scenario_id uuid NOT NULL REFERENCES scenario(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  origin_region_id varchar(80),
  destination_region_id varchar(80),
  direction varchar(24) NOT NULL,
  graph jsonb NOT NULL,
  default_weight numeric(10,4) NOT NULL DEFAULT 1,
  FOREIGN KEY (origin_region_id) REFERENCES region(id),
  FOREIGN KEY (destination_region_id) REFERENCES region(id)
);

CREATE TABLE IF NOT EXISTS timeline_event (
  id varchar(80) PRIMARY KEY,
  scenario_id uuid NOT NULL REFERENCES scenario(id) ON DELETE CASCADE,
  offset_seconds integer NOT NULL CHECK (offset_seconds >= 0),
  event_time time NOT NULL,
  event_type varchar(48) NOT NULL,
  name varchar(200) NOT NULL,
  location varchar(200),
  description text NOT NULL,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_reference varchar(200) NOT NULL,
  priority smallint NOT NULL DEFAULT 50,
  UNIQUE (scenario_id, offset_seconds, name)
);

CREATE TABLE IF NOT EXISTS simulation_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES scenario(id),
  run_code varchar(80) NOT NULL UNIQUE,
  engine_version varchar(32) NOT NULL,
  config_version varchar(32) NOT NULL,
  seed bigint NOT NULL,
  mode varchar(24) NOT NULL CHECK (mode IN ('training','experiment','acceptance','replay')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status varchar(24) NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed','cancelled')),
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_summary jsonb
);

CREATE TABLE IF NOT EXISTS state_snapshot (
  run_id uuid NOT NULL REFERENCES simulation_run(id) ON DELETE CASCADE,
  sampled_at timestamptz NOT NULL,
  simulation_second integer NOT NULL,
  total_passengers integer NOT NULL CHECK (total_passengers >= 0),
  agent_state_counts jsonb NOT NULL,
  active_paths jsonb NOT NULL,
  state_hash varchar(128) NOT NULL,
  PRIMARY KEY (run_id, sampled_at)
);

CREATE TABLE IF NOT EXISTS region_metric (
  run_id uuid NOT NULL REFERENCES simulation_run(id) ON DELETE CASCADE,
  sampled_at timestamptz NOT NULL,
  simulation_second integer NOT NULL,
  region_id varchar(80) NOT NULL REFERENCES region(id),
  occupancy integer NOT NULL CHECK (occupancy >= 0),
  density numeric(8,6) NOT NULL CHECK (density >= 0),
  inflow_per_minute numeric(12,3) NOT NULL DEFAULT 0,
  outflow_per_minute numeric(12,3) NOT NULL DEFAULT 0,
  average_speed numeric(8,4),
  queue_length integer,
  PRIMARY KEY (run_id, sampled_at, region_id)
);

CREATE TABLE IF NOT EXISTS device_event_log (
  run_id uuid NOT NULL REFERENCES simulation_run(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL,
  simulation_second integer NOT NULL,
  device_id varchar(80) NOT NULL REFERENCES device(id),
  old_status varchar(48),
  new_status varchar(48) NOT NULL,
  trigger_event_id varchar(80) REFERENCES timeline_event(id),
  trigger_type varchar(24) NOT NULL CHECK (trigger_type IN ('timeline','rule','operator','replay')),
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (run_id, occurred_at, device_id)
);

CREATE TABLE IF NOT EXISTS consistency_check (
  id bigserial PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES simulation_run(id) ON DELETE CASCADE,
  checked_at timestamptz NOT NULL DEFAULT now(),
  simulation_second integer NOT NULL,
  check_type varchar(48) NOT NULL,
  passed boolean NOT NULL,
  observed_value jsonb,
  expected_value jsonb,
  tolerance numeric(12,6),
  details text
);

CREATE TABLE IF NOT EXISTS requirement_trace (
  requirement_id varchar(40) PRIMARY KEY,
  title varchar(200) NOT NULL,
  source_reference varchar(200) NOT NULL,
  design_reference varchar(500) NOT NULL,
  code_reference varchar(500) NOT NULL,
  test_reference varchar(500) NOT NULL,
  status varchar(24) NOT NULL CHECK (status IN ('planned','implemented','verified','deferred','blocked')),
  baseline_version varchar(32) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS change_record (
  change_id varchar(40) PRIMARY KEY,
  title varchar(200) NOT NULL,
  change_type varchar(32) NOT NULL CHECK (change_type IN ('requirement','design','code','data','test','document')),
  reason text NOT NULL,
  affected_artifacts jsonb NOT NULL,
  requested_by varchar(160),
  approved_by varchar(160),
  baseline_from varchar(32) NOT NULL,
  baseline_to varchar(32) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

SELECT create_hypertable('emergency_sim.state_snapshot', 'sampled_at', if_not_exists => TRUE, migrate_data => TRUE);
SELECT create_hypertable('emergency_sim.region_metric', 'sampled_at', if_not_exists => TRUE, migrate_data => TRUE);
SELECT create_hypertable('emergency_sim.device_event_log', 'occurred_at', if_not_exists => TRUE, migrate_data => TRUE);

CREATE INDEX IF NOT EXISTS idx_timeline_scenario_time ON timeline_event (scenario_id, offset_seconds);
CREATE INDEX IF NOT EXISTS idx_region_metric_region_time ON region_metric (region_id, sampled_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_log_device_time ON device_event_log (device_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_check_run_type ON consistency_check (run_id, check_type, checked_at DESC);

INSERT INTO schema_version(version, checksum, description)
VALUES ('0.1.0', 'BASELINE-2026-08-29', '系统构建与文档体系第一阶段基线')
ON CONFLICT (version) DO NOTHING;

INSERT INTO schema_version(version, checksum, description)
VALUES ('0.2.0', 'INTEGRATED-MAP-2026-08-29', '三层连续总图、设备、路线与监控综合态势基线')
ON CONFLICT (version) DO NOTHING;

INSERT INTO schema_version(version, checksum, description)
VALUES ('0.3.0', 'PAN-ZOOM-MONITOR-2026-08-29', '扩大裁切底图、无滚动条拖拽缩放与监控面板折叠基线')
ON CONFLICT (version) DO NOTHING;
