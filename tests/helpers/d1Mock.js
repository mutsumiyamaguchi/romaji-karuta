// D1 の最小モック
//
// Pages Functions のテスト用に、`env.DB.prepare(sql).bind(...).first/all/run` を
// in-memory で模した最小実装を提供する。実 SQLite を埋め込むのは過剰なので、
// 本プロジェクトで使う SQL パターン（INSERT / UPDATE / DELETE / 単純な SELECT）
// にだけ反応するパターンマッチで賄う。
//
// テーブル状態は呼び出し元で参照できるよう、`db._state` から直接覗ける。
//
// サポートしている SQL パターン:
//   - INSERT INTO students (id, name, points) VALUES (?, ?, 0)
//   - INSERT INTO mistakes (student_id, character, mode, count) VALUES (?, ?, ?, 1)
//   - UPDATE students SET points = points + ? WHERE id = ?
//   - UPDATE mistakes SET count = count + 1, last_at = datetime('now') WHERE id = ?
//   - DELETE FROM mistakes WHERE student_id = ?
//   - DELETE FROM students WHERE id = ?
//   - SELECT * FROM students (orderable by created_at)
//   - SELECT pin_hash FROM mentor_config WHERE id = 1
//   - SELECT id, points FROM students WHERE id = ?
//   - SELECT id FROM students WHERE id = ?
//   - SELECT id, count FROM mistakes WHERE student_id = ? AND character = ? AND mode = ?
//   - SELECT ... FROM mistakes WHERE student_id = ? ORDER BY count DESC, last_at DESC

/**
 * 新しい D1 モックを生成する。
 * @param {{
 *   students?: Array<{id: string, name: string, points: number, created_at?: string}>,
 *   mistakes?: Array<{id: number, student_id: string, character: string, mode: string, count: number, last_at?: string}>,
 *   mentor_config?: {id: number, pin_hash: string, immediate_revenge?: number, summary_revenge?: number}
 * }} [initial]
 */
export function createD1Mock(initial = {}) {
  const state = {
    students: [...(initial.students ?? [])],
    mistakes: [...(initial.mistakes ?? [])],
    mentor_config: initial.mentor_config ?? null,
    _mistakesAutoId: (initial.mistakes ?? []).reduce(
      (max, m) => Math.max(max, m.id ?? 0),
      0
    ),
  };

  /** @param {string} sql */
  const prepare = (sql) => {
    return new PreparedStatement(state, sql.trim());
  };

  return {
    prepare,
    _state: state,
  };
}

class PreparedStatement {
  constructor(state, sql) {
    this._state = state;
    this._sql = sql;
    this._params = [];
  }

  bind(...params) {
    const next = new PreparedStatement(this._state, this._sql);
    next._params = params;
    return next;
  }

  async first() {
    const rows = this._execute();
    return rows[0] ?? null;
  }

  async all() {
    const rows = this._execute();
    return { results: rows, success: true };
  }

  async run() {
    return this._execute(true);
  }

  _execute(returnMeta = false) {
    const sql = this._sql;
    const p = this._params;

    // ---- INSERT students ----
    if (/^INSERT\s+INTO\s+students/i.test(sql)) {
      const [id, name] = p;
      const created_at = nowIso();
      this._state.students.push({ id, name, points: 0, created_at });
      return returnMeta
        ? { success: true, meta: { changes: 1 } }
        : [];
    }

    // ---- INSERT mistakes ----
    if (/^INSERT\s+INTO\s+mistakes/i.test(sql)) {
      const [student_id, character, mode] = p;
      const id = ++this._state._mistakesAutoId;
      const last_at = nowIso();
      this._state.mistakes.push({
        id,
        student_id,
        character,
        mode,
        count: 1,
        last_at,
      });
      return returnMeta
        ? { success: true, meta: { changes: 1, last_row_id: id } }
        : [];
    }

    // ---- UPDATE students points ----
    if (/^UPDATE\s+students\s+SET\s+points\s*=\s*points\s*\+\s*\?/i.test(sql)) {
      const [delta, id] = p;
      const target = this._state.students.find((s) => s.id === id);
      if (target) target.points += delta;
      return returnMeta
        ? { success: true, meta: { changes: target ? 1 : 0 } }
        : [];
    }

    // ---- UPDATE mistakes count ----
    if (/^UPDATE\s+mistakes\s+SET\s+count\s*=\s*count\s*\+\s*1/i.test(sql)) {
      const [id] = p;
      const target = this._state.mistakes.find((m) => m.id === id);
      if (target) {
        target.count += 1;
        target.last_at = nowIso();
      }
      return returnMeta
        ? { success: true, meta: { changes: target ? 1 : 0 } }
        : [];
    }

    // ---- DELETE mistakes by student ----
    if (/^DELETE\s+FROM\s+mistakes\s+WHERE\s+student_id\s*=\s*\?/i.test(sql)) {
      const [student_id] = p;
      const before = this._state.mistakes.length;
      this._state.mistakes = this._state.mistakes.filter(
        (m) => m.student_id !== student_id
      );
      const changes = before - this._state.mistakes.length;
      return returnMeta ? { success: true, meta: { changes } } : [];
    }

    // ---- DELETE students by id ----
    if (/^DELETE\s+FROM\s+students\s+WHERE\s+id\s*=\s*\?/i.test(sql)) {
      const [id] = p;
      const before = this._state.students.length;
      this._state.students = this._state.students.filter((s) => s.id !== id);
      const changes = before - this._state.students.length;
      return returnMeta ? { success: true, meta: { changes } } : [];
    }

    // ---- SELECT mentor_config ----
    if (/SELECT\s+pin_hash\s+FROM\s+mentor_config\s+WHERE\s+id\s*=\s*1/i.test(sql)) {
      const row = this._state.mentor_config
        ? { pin_hash: this._state.mentor_config.pin_hash }
        : null;
      return row ? [row] : [];
    }

    // ---- SELECT student by id (with points) ----
    if (/SELECT\s+id,\s*points\s+FROM\s+students\s+WHERE\s+id\s*=\s*\?/i.test(sql)) {
      const [id] = p;
      const s = this._state.students.find((x) => x.id === id);
      return s ? [{ id: s.id, points: s.points }] : [];
    }

    // ---- SELECT student by id (full) ----
    if (/SELECT\s+id,\s*name,\s*points,\s*created_at\s+FROM\s+students\s+WHERE\s+id\s*=\s*\?/i.test(sql)) {
      const [id] = p;
      const s = this._state.students.find((x) => x.id === id);
      return s
        ? [{ id: s.id, name: s.name, points: s.points, created_at: s.created_at }]
        : [];
    }

    // ---- SELECT id FROM students WHERE id = ? ----
    if (/SELECT\s+id\s+FROM\s+students\s+WHERE\s+id\s*=\s*\?/i.test(sql)) {
      const [id] = p;
      const s = this._state.students.find((x) => x.id === id);
      return s ? [{ id: s.id }] : [];
    }

    // ---- SELECT mistake by composite key ----
    if (/SELECT\s+id,\s*count\s+FROM\s+mistakes/i.test(sql)) {
      const [student_id, character, mode] = p;
      const m = this._state.mistakes.find(
        (x) =>
          x.student_id === student_id && x.character === character && x.mode === mode
      );
      return m ? [{ id: m.id, count: m.count }] : [];
    }

    if (/SELECT\s+id,\s*student_id,\s*character,\s*mode,\s*count,\s*last_at\s+FROM\s+mistakes\s+WHERE\s+student_id\s*=\s*\?\s+AND\s+character\s*=\s*\?\s+AND\s+mode\s*=\s*\?/i.test(sql)) {
      const [student_id, character, mode] = p;
      const m = this._state.mistakes.find(
        (x) =>
          x.student_id === student_id && x.character === character && x.mode === mode
      );
      return m ? [m] : [];
    }

    // ---- SELECT mistakes by student_id (ordered) ----
    if (/SELECT\s+id,\s*student_id,\s*character,\s*mode,\s*count,\s*last_at\s+FROM\s+mistakes\s+WHERE\s+student_id\s*=\s*\?/i.test(sql)) {
      const [student_id] = p;
      const list = this._state.mistakes
        .filter((m) => m.student_id === student_id)
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return (b.last_at ?? '').localeCompare(a.last_at ?? '');
        });
      return list;
    }

    // ---- SELECT all students ----
    if (/SELECT\s+id,\s*name,\s*points,\s*created_at\s+FROM\s+students/i.test(sql)) {
      const list = [...this._state.students].sort((a, b) =>
        (a.created_at ?? '').localeCompare(b.created_at ?? '')
      );
      return list;
    }

    throw new Error(`d1Mock: unsupported SQL: ${sql}`);
  }
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * テスト用のリクエストを生成するヘルパー。
 * @param {string} url
 * @param {RequestInit & {body?: unknown}} [init]
 */
export function makeRequest(url, init = {}) {
  const headers = new Headers(init.headers ?? {});
  let body = init.body;
  if (body !== undefined && body !== null && typeof body !== 'string') {
    body = JSON.stringify(body);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
  }
  return new Request(url, {
    method: init.method ?? 'GET',
    headers,
    body,
  });
}
