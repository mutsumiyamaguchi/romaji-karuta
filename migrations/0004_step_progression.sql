-- Validate before changing any persistent row. The INSERT aborts the migration for
-- negative, fractional, text, or NULL legacy balances.
CREATE TABLE _points_migration_validation (
  value INTEGER NOT NULL CHECK (typeof(value) = 'integer' AND value >= 0)
);
INSERT INTO _points_migration_validation(value) SELECT points FROM students;
DROP TABLE _points_migration_validation;

ALTER TABLE students ADD COLUMN total_points INTEGER NOT NULL DEFAULT 0
  CHECK (typeof(total_points) = 'integer' AND total_points >= 0);
ALTER TABLE students ADD COLUMN available_points INTEGER NOT NULL DEFAULT 0
  CHECK (typeof(available_points) = 'integer' AND available_points >= 0);
ALTER TABLE students ADD COLUMN legacy_full_access INTEGER NOT NULL DEFAULT 0
  CHECK (legacy_full_access IN (0, 1));

UPDATE students
SET total_points = points,
    available_points = points,
    legacy_full_access = 1;

CREATE TABLE practice_completions (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  curriculum_version TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  reward INTEGER NOT NULL CHECK (typeof(reward) = 'integer' AND reward >= 0),
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (student_id, curriculum_version, unit_id)
);

CREATE TABLE assessment_progress (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  step INTEGER NOT NULL CHECK (step BETWEEN 1 AND 3),
  curriculum_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('unlocked', 'in_progress', 'passed')),
  started_at TEXT,
  passed_at TEXT,
  PRIMARY KEY (student_id, step)
);

CREATE TABLE assessment_answers (
  student_id TEXT NOT NULL,
  step INTEGER NOT NULL,
  curriculum_version TEXT NOT NULL,
  character_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('unseen', 'review_required', 'correct')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (student_id, step, curriculum_version, character_id),
  FOREIGN KEY (student_id, step) REFERENCES assessment_progress(student_id, step) ON DELETE CASCADE
);

CREATE INDEX idx_practice_completions_student ON practice_completions(student_id);
CREATE INDEX idx_assessment_answers_progress ON assessment_answers(student_id, step, curriculum_version);
