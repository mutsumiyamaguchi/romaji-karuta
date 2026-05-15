-- Romaji Karuta MVP 初期スキーマ
-- 生成日: 2026-05-13
--
-- 注意:
--   - SQLite (D1) は外部キー制約をデフォルト無効。`PRAGMA foreign_keys = ON;` は
--     接続単位で設定する必要があるが、D1 ではセッション単位での明示が現状効かない
--     ことがあるため、CASCADE 削除はアプリ側で明示的に発行することも検討する
--   - pin_hash は Web Crypto SubtleCrypto.digest('SHA-256') で生成し、hex 64 文字を想定

-- 生徒
CREATE TABLE IF NOT EXISTS students (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  points     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- そにもつリスト（誤答記録）
CREATE TABLE IF NOT EXISTS mistakes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  character  TEXT NOT NULL,
  mode       TEXT NOT NULL CHECK (mode IN ('h2r','r2h','H2R')),
  count      INTEGER NOT NULL DEFAULT 1,
  last_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mistakes_student ON mistakes(student_id);

-- メンター設定（シングルトン: id=1 固定）
CREATE TABLE IF NOT EXISTS mentor_config (
  id                INTEGER PRIMARY KEY CHECK (id = 1),
  pin_hash          TEXT NOT NULL,
  immediate_revenge INTEGER DEFAULT 1,
  summary_revenge   INTEGER DEFAULT 1
);

-- 初期データ
-- pin_hash は実運用時に Web Crypto SHA-256 で生成して書き換える（PIN: '0000' 想定）
INSERT OR IGNORE INTO mentor_config (id, pin_hash, immediate_revenge, summary_revenge)
VALUES (1, 'PLACEHOLDER', 1, 1);
