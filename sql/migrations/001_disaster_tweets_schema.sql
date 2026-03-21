-- 001_disaster_tweets_schema.sql
-- Purpose:
-- 1) Create the disaster database if missing
-- 2) Create tweets table with an incremental tweet ID (id AUTO_INCREMENT)
-- 3) Add/align columns for backend auto-close precision (resolved_at, closed_at)
-- 4) Add useful indexes for polling and active-alert queries

-- Create and switch to database
CREATE DATABASE IF NOT EXISTS disaster;
USE disaster;

-- Fresh table create for new setups
CREATE TABLE IF NOT EXISTS tweets (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    content TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    request_type VARCHAR(100) DEFAULT NULL,
    urgency ENUM('urgent', 'non-urgent') NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at DATETIME NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    closed_at DATETIME NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- Incremental tweet ID hardening for existing tables
ALTER TABLE tweets
    MODIFY COLUMN id INT UNSIGNED NOT NULL AUTO_INCREMENT;

-- Schema alignment for existing tables
ALTER TABLE tweets
    ADD COLUMN IF NOT EXISTS content TEXT NULL,
    ADD COLUMN IF NOT EXISTS location VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS request_type VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS urgency ENUM('urgent', 'non-urgent') NULL,
    ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS resolved_at DATETIME NULL,
    ADD COLUMN IF NOT EXISTS is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS closed_at DATETIME NULL,
    ADD COLUMN IF NOT EXISTS timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- If an older schema used tweet instead of content, backfill content safely
SET @tweet_col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tweets'
        AND COLUMN_NAME = 'tweet'
);

SET @sql_backfill = IF(
    @tweet_col_exists > 0,
    'UPDATE tweets SET content = tweet WHERE (content IS NULL OR content = '''') AND tweet IS NOT NULL',
    'SELECT 1'
);
PREPARE stmt_backfill FROM @sql_backfill;
EXECUTE stmt_backfill;
DEALLOCATE PREPARE stmt_backfill;

-- Performance indexes for polling and dashboard filters (idempotent)
SET @idx_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tweets'
        AND INDEX_NAME = 'idx_tweets_timestamp'
);
SET @sql_idx = IF(@idx_exists = 0, 'CREATE INDEX idx_tweets_timestamp ON tweets (timestamp)', 'SELECT 1');
PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

SET @idx_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tweets'
        AND INDEX_NAME = 'idx_tweets_active_poll'
);
SET @sql_idx = IF(@idx_exists = 0, 'CREATE INDEX idx_tweets_active_poll ON tweets (is_closed, timestamp)', 'SELECT 1');
PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

SET @idx_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tweets'
        AND INDEX_NAME = 'idx_tweets_urgency_active'
);
SET @sql_idx = IF(@idx_exists = 0, 'CREATE INDEX idx_tweets_urgency_active ON tweets (urgency, is_closed)', 'SELECT 1');
PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

SET @idx_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tweets'
        AND INDEX_NAME = 'idx_tweets_resolved_state'
);
SET @sql_idx = IF(@idx_exists = 0, 'CREATE INDEX idx_tweets_resolved_state ON tweets (is_resolved, is_closed, resolved_at)', 'SELECT 1');
PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;
