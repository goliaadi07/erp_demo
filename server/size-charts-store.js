// Garment size charts for the dashboard "Dress Sizes" page.
//
// Each chart is one garment (shirt, pant, pinaco, ...) with a list of measurement
// fields and one row per size. Writes are whole-chart upserts (PUT), so any server
// instance can accept an edit even if it has never seen the chart before — this keeps
// the page working on Vercel's multi-instance / ephemeral /tmp SQLite, and the browser
// re-syncs its last saved copy if an instance comes up with only the seed data.
//
// Storage: Postgres when QUOTES_DATABASE_URL / DATABASE_URL / POSTGRES_URL is set
// (shared with quotes-store), otherwise the SQLite database from server/db.js.
const db = require('./db');
const quotes = require('./quotes-store');

const ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const FIELD_RE = /^[a-z][a-z0-9_]{0,23}$/;

const SEED = [
  { id: 'shirt', name: 'Shirt', basis: 'Chest (in)', fields: ['chest', 'length', 'shoulder', 'sleeve', 'collar'],
    rows: [22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44].map((c, i) => ({ size: String(c), chest: c + 2, length: 18 + i * 1.25, shoulder: 10.5 + i * 0.6, sleeve: 6.5 + i * 0.4, collar: 11 + i * 0.5 })),
    notes: 'Half sleeve uses the sleeve column; full sleeve add ~14 in.' },
  { id: 'pant', name: 'Pant', basis: 'Waist (in)', fields: ['waist', 'hip', 'length', 'inseam', 'bottom'],
    rows: [20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40].map((w, i) => ({ size: String(w), waist: w, hip: w + 8, length: 26 + i * 1.5, inseam: 19 + i * 1.2, bottom: 6.5 + i * 0.3 })),
    notes: '' },
  { id: 'skirt', name: 'Skirt', basis: 'Waist (in)', fields: ['waist', 'hip', 'length'],
    rows: [18, 20, 22, 24, 26, 28, 30, 32, 34].map((w, i) => ({ size: String(w), waist: w, hip: w + 7, length: 12 + i * 1.5 })),
    notes: 'Lengths can be changed per school.' },
  { id: 'pinaco', name: 'Pinaco', basis: 'Age', fields: ['chest', 'length', 'shoulder', 'strap'],
    rows: [['3–4Y', 22, 20, 9.5, 11], ['5–6Y', 24, 23, 10, 12], ['7–8Y', 26, 26, 10.5, 13], ['9–10Y', 28, 29, 11, 14]].map(([size, chest, length, shoulder, strap]) => ({ size, chest, length, shoulder, strap })),
    notes: 'Pinafore dress — wear over the uniform shirt.' },
  { id: 'grammer', name: 'Grammer', basis: 'Age', fields: ['chest', 'waist', 'length', 'inseam'],
    rows: [['3–4Y', 22, 21, 30, 12], ['5–6Y', 24, 22, 34, 14], ['7–8Y', 26, 23, 38, 16], ['9–10Y', 28, 24, 42, 18]].map(([size, chest, waist, length, inseam]) => ({ size, chest, waist, length, inseam })),
    notes: 'Dungaree style — length is shoulder to hem.' },
  { id: 'halfhastin', name: 'Half Hastin', basis: 'Chest (in)', fields: ['chest', 'length', 'shoulder', 'sleeve'],
    rows: [22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44].map((c, i) => ({ size: String(c), chest: c + 2, length: 17.5 + i * 1.2, shoulder: 10.5 + i * 0.6, sleeve: 6 + i * 0.35 })),
    notes: '' },
  { id: 'bandi', name: 'Bandi', basis: 'Chest (in)', fields: ['chest', 'length', 'shoulder'],
    rows: [24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46].map((c, i) => ({ size: String(c), chest: c + 2, length: 17 + i * 1.1, shoulder: 11 + i * 0.6 })),
    notes: 'Nehru-style waistcoat.' },
].map((c, i) => ({ ...c, position: i, rows: c.rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v * 2) / 2 : v]))) }));

function httpError(status, message) { const e = new Error(message); e.status = status; return e; }

function clean(id, body) {
  if (!ID_RE.test(id)) throw httpError(400, 'Invalid chart id');
  const b = body || {};
  const name = String(b.name || '').trim().slice(0, 60);
  if (!name) throw httpError(400, 'Garment name is required');
  const fields = Array.from(new Set((Array.isArray(b.fields) ? b.fields : []).map((f) => String(f).trim().toLowerCase().replace(/\s+/g, '_')).filter((f) => FIELD_RE.test(f) && f !== 'size'))).slice(0, 12);
  const rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, 60).map((r) => {
    const size = String((r && r.size) || '').trim().slice(0, 20);
    const out = { size };
    fields.forEach((f) => {
      const v = r ? r[f] : null;
      if (v === '' || v == null) return;
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0 && n < 1000) out[f] = Math.round(n * 100) / 100;
    });
    return out;
  }).filter((r) => r.size);
  return {
    id,
    name,
    basis: String(b.basis || '').trim().slice(0, 40),
    notes: String(b.notes || '').trim().slice(0, 300),
    fields,
    rows,
    position: Number.isInteger(b.position) ? b.position : 999,
  };
}

// ------------------------------------------------------------------ SQLite
function sqlite() {
  const d = db.getDb();
  if (!sqlite.ready) {
    d.exec(`CREATE TABLE IF NOT EXISTS size_charts (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, basis TEXT, notes TEXT,
      fields TEXT NOT NULL DEFAULT '[]', rows TEXT NOT NULL DEFAULT '[]',
      position INTEGER NOT NULL DEFAULT 999,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`);
    if (d.prepare('SELECT COUNT(*) AS c FROM size_charts').get().c === 0) {
      const ins = d.prepare('INSERT INTO size_charts(id,name,basis,notes,fields,rows,position,updated_at) VALUES(?,?,?,?,?,?,?,?)');
      d.transaction(() => SEED.forEach((c) => ins.run(c.id, c.name, c.basis, c.notes, JSON.stringify(c.fields), JSON.stringify(c.rows), c.position, '2026-01-01T00:00:00.000Z')))();
    }
    sqlite.ready = true;
  }
  return d;
}
const mapSqlite = (r) => ({ id: r.id, name: r.name, basis: r.basis || '', notes: r.notes || '', fields: JSON.parse(r.fields || '[]'), rows: JSON.parse(r.rows || '[]'), position: r.position, updatedAt: r.updated_at });

const sqliteStore = {
  kind: 'sqlite',
  async list() { return sqlite().prepare('SELECT * FROM size_charts ORDER BY position, name').all().map(mapSqlite); },
  async upsert(c) {
    const d = sqlite();
    const now = new Date().toISOString();
    d.prepare(`INSERT INTO size_charts(id,name,basis,notes,fields,rows,position,updated_at) VALUES(?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, basis=excluded.basis, notes=excluded.notes, fields=excluded.fields,
      rows=excluded.rows, position=excluded.position, updated_at=excluded.updated_at`)
      .run(c.id, c.name, c.basis, c.notes, JSON.stringify(c.fields), JSON.stringify(c.rows), c.position, c.updatedAt || now);
    return mapSqlite(d.prepare('SELECT * FROM size_charts WHERE id=?').get(c.id));
  },
  async remove(id) { return sqlite().prepare('DELETE FROM size_charts WHERE id=?').run(id).changes > 0; },
};

// ---------------------------------------------------------------- Postgres
let pgReady = null;
function pg() {
  const pool = quotes.getPool();
  if (!pgReady) {
    pgReady = (async () => {
      await pool.query(`CREATE TABLE IF NOT EXISTS size_charts (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, basis TEXT, notes TEXT,
        fields JSONB NOT NULL DEFAULT '[]', rows JSONB NOT NULL DEFAULT '[]',
        position INTEGER NOT NULL DEFAULT 999, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
      const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM size_charts');
      if (rows[0].c === 0) {
        for (const c of SEED) {
          await pool.query('INSERT INTO size_charts(id,name,basis,notes,fields,rows,position,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING',
            [c.id, c.name, c.basis, c.notes, JSON.stringify(c.fields), JSON.stringify(c.rows), c.position, '2026-01-01T00:00:00.000Z']);
        }
      }
    })().catch((e) => { pgReady = null; throw e; });
  }
  return pgReady.then(() => pool);
}
const mapPg = (r) => ({ id: r.id, name: r.name, basis: r.basis || '', notes: r.notes || '', fields: r.fields || [], rows: r.rows || [], position: r.position, updatedAt: new Date(r.updated_at).toISOString() });
const pgStore = {
  kind: 'postgres',
  async list() { const p = await pg(); return (await p.query('SELECT * FROM size_charts ORDER BY position, name')).rows.map(mapPg); },
  async upsert(c) {
    const p = await pg();
    const { rows } = await p.query(`INSERT INTO size_charts(id,name,basis,notes,fields,rows,position,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,COALESCE($8::timestamptz, now()))
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, basis=EXCLUDED.basis, notes=EXCLUDED.notes, fields=EXCLUDED.fields,
      rows=EXCLUDED.rows, position=EXCLUDED.position, updated_at=EXCLUDED.updated_at RETURNING *`,
    [c.id, c.name, c.basis, c.notes, JSON.stringify(c.fields), JSON.stringify(c.rows), c.position, c.updatedAt || null]);
    return mapPg(rows[0]);
  },
  async remove(id) { const p = await pg(); return (await p.query('DELETE FROM size_charts WHERE id=$1', [id])).rowCount > 0; },
};

const store = () => (quotes.pgUrl() ? pgStore : sqliteStore);

module.exports = {
  backend: () => store().kind,
  listCharts: () => store().list(),
  saveChart: (id, body) => {
    const c = clean(id, body);
    // Accept a client timestamp only when re-syncing an older saved copy.
    if (body && typeof body.updatedAt === 'string' && body.resync && !Number.isNaN(Date.parse(body.updatedAt))) c.updatedAt = new Date(body.updatedAt).toISOString();
    return store().upsert(c);
  },
  deleteChart: (id) => { if (!ID_RE.test(id)) throw httpError(400, 'Invalid chart id'); return store().remove(id); },
};
