-- Romaji Karuta H2R モード廃止 / mistakes.mode 値の正規化
-- 生成日: 2026-05-16
--
-- 背景:
--   2026-05-16 の仕様変更で出題モードから H2R（大文字モード）を廃止し、
--   アルファベットの大小は letterCase ('upper' | 'lower') の独立トグルで
--   制御するように変更した。これにより mistakes.mode は h2r / r2h の 2 値に
--   集約される。
--
--   旧 H2R レコードは「ひらがな → ローマ字（表示が大文字）」だった本質的に
--   h2r と同じ学習履歴なので、h2r にマージする。
--
-- マイグレーション内容:
--   1) 同じ (student_id, character) で h2r と H2R が共存する場合:
--      h2r 側に count を合算し、last_at を新しい方に更新。H2R 行は削除。
--   2) h2r 側が無い場合: H2R レコードの mode を 'h2r' に rename。
--   3) CHECK 制約を mode IN ('h2r', 'r2h') に縮める。SQLite は ALTER で
--      CHECK 制約を直接変更できないため、テーブル recreate（new テーブル
--      作成 → INSERT SELECT → 旧テーブル DROP → RENAME）で対応する。
--   4) インデックス idx_mistakes_student を再作成。
--
-- 互換性:
--   - Cloudflare D1（SQLite）で動作。CHECK 制約変更のためテーブル recreate を
--     行うが、データは保持される。
--   - 0001 / 0002 が適用済みの状態を前提とする。
--   - migration 適用後はクライアント / サーバ双方で H2R を送らないように
--     実装側も同時更新が必要（commit 単位で揃える）。
--
-- ロールバック手順:
--   このマイグレーションを差し戻す場合は以下を実行する。
--   旧 H2R レコードは既に h2r にマージされているため復元できない点に注意。
--
--     -- 1) CHECK を ('h2r','r2h','H2R') に戻す（recreate）
--     CREATE TABLE mistakes_rollback (
--       id         INTEGER PRIMARY KEY AUTOINCREMENT,
--       student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
--       character  TEXT NOT NULL,
--       mode       TEXT NOT NULL CHECK (mode IN ('h2r','r2h','H2R')),
--       count      INTEGER NOT NULL DEFAULT 1,
--       last_at    TEXT DEFAULT (datetime('now'))
--     );
--     INSERT INTO mistakes_rollback (id, student_id, character, mode, count, last_at)
--       SELECT id, student_id, character, mode, count, last_at FROM mistakes;
--     DROP TABLE mistakes;
--     ALTER TABLE mistakes_rollback RENAME TO mistakes;
--     CREATE INDEX IF NOT EXISTS idx_mistakes_student ON mistakes(student_id);

-- 1) H2R を h2r にマージ
--    h2r 側に既存行があるケース: count を合算し、last_at を新しい方に更新
UPDATE mistakes AS m
SET
  count   = m.count + (
    SELECT h.count FROM mistakes AS h
    WHERE h.student_id = m.student_id
      AND h.character  = m.character
      AND h.mode       = 'H2R'
  ),
  last_at = (
    SELECT CASE
      WHEN h.last_at > m.last_at THEN h.last_at
      ELSE m.last_at
    END
    FROM mistakes AS h
    WHERE h.student_id = m.student_id
      AND h.character  = m.character
      AND h.mode       = 'H2R'
  )
WHERE m.mode = 'h2r'
  AND EXISTS (
    SELECT 1 FROM mistakes AS h
    WHERE h.student_id = m.student_id
      AND h.character  = m.character
      AND h.mode       = 'H2R'
  );

-- マージ済みの H2R 行（h2r が同時に存在していたもの）を削除
DELETE FROM mistakes
WHERE mode = 'H2R'
  AND EXISTS (
    SELECT 1 FROM mistakes AS h2
    WHERE h2.student_id = mistakes.student_id
      AND h2.character  = mistakes.character
      AND h2.mode       = 'h2r'
  );

-- 残った H2R レコード（h2r 側が無かったもの）は mode を 'h2r' に rename
UPDATE mistakes SET mode = 'h2r' WHERE mode = 'H2R';

-- 2) CHECK 制約を mode IN ('h2r','r2h') に縮める（テーブル recreate）
CREATE TABLE mistakes_new (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  character  TEXT NOT NULL,
  mode       TEXT NOT NULL CHECK (mode IN ('h2r','r2h')),
  count      INTEGER NOT NULL DEFAULT 1,
  last_at    TEXT DEFAULT (datetime('now'))
);

INSERT INTO mistakes_new (id, student_id, character, mode, count, last_at)
  SELECT id, student_id, character, mode, count, last_at FROM mistakes;

DROP TABLE mistakes;
ALTER TABLE mistakes_new RENAME TO mistakes;

CREATE INDEX IF NOT EXISTS idx_mistakes_student ON mistakes(student_id);
