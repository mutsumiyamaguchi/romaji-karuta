-- Romaji Karuta mentor_config 廃止列削除
-- 生成日: 2026-05-16
--
-- 背景:
--   2026-05-16 の仕様変更で自動リベンジ機能（useRevenge）が完全廃止された。
--   結果画面の手動「やりなおす」ボタンに置換済みのため、mentor_config の
--   immediate_revenge / summary_revenge 列は使われなくなった。
--   DB スキーマと現実装の乖離を解消する DB クリーンアップ。
--
-- セットアップ手順 (fresh DB):
--   `wrangler d1 migrations apply <db>` で 0001 → 0002 を順に適用する。
--   未適用 migration を自動で全て流すコマンドのため、通常は意識不要。
--   ただし手動で SQL を投入する場合は 0001 のみで停止しないこと
--   (0001 だけだと廃止列付きのスキーマで残り、現コードと不整合になる)。
--
-- 互換性:
--   SQLite 3.35+ で ALTER TABLE ... DROP COLUMN がサポートされている。
--   Cloudflare D1 は対応済みでこの構文で動作する。
--
-- ロールバック手順:
--   このマイグレーションを差し戻す場合は以下を実行する。
--   既存行のデフォルト値（1）で復元される。実データの履歴は失われる点に注意。
--
--     ALTER TABLE mentor_config ADD COLUMN immediate_revenge INTEGER DEFAULT 1;
--     ALTER TABLE mentor_config ADD COLUMN summary_revenge   INTEGER DEFAULT 1;

ALTER TABLE mentor_config DROP COLUMN immediate_revenge;
ALTER TABLE mentor_config DROP COLUMN summary_revenge;
