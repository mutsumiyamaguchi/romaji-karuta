#!/bin/sh
set -eu

db_file="${TMPDIR:-/tmp}/romaji-karuta-step-progression-$$.sqlite"
trap 'rm -f "$db_file" "$db_file-invalid" "$db_file-fraction" "$db_file-text" "$db_file-null"' EXIT

sqlite3 "$db_file" < migrations/0001_init.sql
sqlite3 "$db_file" < migrations/0002_drop_revenge_columns.sql
sqlite3 "$db_file" < migrations/0003_merge_uppercase_mode.sql
sqlite3 "$db_file" "INSERT INTO students(id,name,points) VALUES ('legacy','Legacy',1000);"
sqlite3 "$db_file" < migrations/0004_step_progression.sql

test "$(sqlite3 "$db_file" "SELECT total_points||','||available_points||','||legacy_full_access FROM students WHERE id='legacy';")" = "1000,1000,1"
sqlite3 "$db_file" "INSERT INTO students(id,name,points) VALUES ('new','New',0);"
test "$(sqlite3 "$db_file" "SELECT total_points||','||available_points||','||legacy_full_access FROM students WHERE id='new';")" = "0,0,0"

# Unique ledgers and balance checks reject duplicate/negative state.
sqlite3 "$db_file" "INSERT INTO practice_completions(student_id,curriculum_version,unit_id,reward) VALUES('new','v1','seion:あ',100);"
if sqlite3 "$db_file" "INSERT INTO practice_completions(student_id,curriculum_version,unit_id,reward) VALUES('new','v1','seion:あ',100);" 2>/dev/null; then exit 1; fi
if sqlite3 "$db_file" "UPDATE students SET available_points=-1 WHERE id='new';" 2>/dev/null; then exit 1; fi

# Explicit child cleanup matches the delete handler's order.
sqlite3 "$db_file" "INSERT INTO assessment_progress(student_id,step,curriculum_version,status) VALUES('new',1,'v1','unlocked'); INSERT INTO assessment_answers(student_id,step,curriculum_version,character_id,state) VALUES('new',1,'v1','a','unseen'); DELETE FROM assessment_answers WHERE student_id='new'; DELETE FROM assessment_progress WHERE student_id='new'; DELETE FROM practice_completions WHERE student_id='new'; DELETE FROM students WHERE id='new';"
test "$(sqlite3 "$db_file" "SELECT (SELECT count(*) FROM students WHERE id='new')+(SELECT count(*) FROM practice_completions WHERE student_id='new')+(SELECT count(*) FROM assessment_progress WHERE student_id='new')+(SELECT count(*) FROM assessment_answers WHERE student_id='new');")" = "0"

# Invalid legacy points abort the migration rather than coercing them.
sqlite3 "$db_file-invalid" < migrations/0001_init.sql
sqlite3 "$db_file-invalid" "INSERT INTO students(id,name,points) VALUES ('bad','Bad',-1);"
if sqlite3 "$db_file-invalid" < migrations/0004_step_progression.sql 2>/dev/null; then exit 1; fi

for variant in fraction text; do
  target="$db_file-$variant"
  sqlite3 "$target" < migrations/0001_init.sql
  if [ "$variant" = fraction ]; then value='1.5'; else value="'broken'"; fi
  sqlite3 "$target" "INSERT INTO students(id,name,points) VALUES ('bad','Bad',$value);"
  if sqlite3 "$target" < migrations/0004_step_progression.sql 2>/dev/null; then exit 1; fi
done

# NULL cannot exist in the baseline schema and is rejected even before migration.
sqlite3 "$db_file-null" < migrations/0001_init.sql
if sqlite3 "$db_file-null" "INSERT INTO students(id,name,points) VALUES ('bad','Bad',NULL);" 2>/dev/null; then exit 1; fi

echo 'step progression sqlite verifier: PASS'
