// Quote-request storage (public "Request a quote" form + dashboard notifications).
//
// Production (Vercel): a hosted Postgres database (Neon via the Vercel Marketplace) so
// quotes and their "seen" state survive cold starts, redeploys and multiple instances.
// Detected from QUOTES_DATABASE_URL / DATABASE_URL / POSTGRES_URL (postgres:// URLs only).
// Local dev / no URL: falls back to the existing SQLite database (server/db.js).
//
// Only quote_requests lives here; the rest of the ERP data stays in SQLite.
const db = require('./db');

const MAX_LIST = 300;

function pgUrl() {
  const candidates = [process.env.QUOTES_DATABASE_URL, process.env.DATABASE_URL, process.env.POSTGRES_URL];
  return candidates.find((u) => typeof u === 'string' && /^postgres(ql)?:\/\//i.test(u)) || null;
}

function toIso(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  const s = String(v);
  return /Z$|[+-]\d\d:?\d\d$/.test(s) ? new Date(s).toISOString() : new Date(`${s.replace(' ', 'T')}Z`).toISOString();
}

function mapRow(row) {
  const seenAt = toIso(row.seen_at);
  return {
    id: Number(row.id),
    firstName: row.first_name,
    surname: row.surname,
    mobile: row.mobile,
    email: row.email,
    productId: row.product_id,
    productName: row.product_name,
    message: row.message || '',
    status: seenAt ? 'seen' : 'new',
    isNew: !seenAt,
    seenAt,
    // Back-compat for older clients.
    isRead: !!seenAt,
    readAt: seenAt,
    createdAt: toIso(row.created_at),
  };
}

// ---------------------------------------------------------------- Postgres
let pool = null;
let pgReady = null;

function getPool() {
  if (!pool) {
    const { Pool } = require('pg');
    const url = pgUrl();
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    pool = new Pool({
      connectionString: url,
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 8000,
      ssl: local ? false : { rejectUnauthorized: false },
    });
    pool.on('error', (err) => console.warn('[quotes] pg pool error:', err.message));
  }
  return pool;
}

function ensurePgSchema() {
  if (!pgReady) {
    pgReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS quote_requests (
        id BIGSERIAL PRIMARY KEY,
        first_name TEXT NOT NULL,
        surname TEXT NOT NULL,
        mobile TEXT NOT NULL,
        email TEXT NOT NULL,
        product_id TEXT,
        product_name TEXT NOT NULL,
        message TEXT,
        seen_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS message TEXT;
      ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ;
      CREATE INDEX IF NOT EXISTS idx_quote_requests_created ON quote_requests (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_quote_requests_unseen ON quote_requests (created_at DESC) WHERE seen_at IS NULL;
    `).catch((err) => { pgReady = null; throw err; });
  }
  return pgReady;
}

async function pq(sql, params) {
  await ensurePgSchema();
  return getPool().query(sql, params);
}

const pgStore = {
  kind: 'postgres',
  async create(q) {
    const { rows } = await pq(
      `INSERT INTO quote_requests (first_name, surname, mobile, email, product_id, product_name, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [q.firstName, q.surname, q.mobile, q.email, q.productId, q.productName, q.message || null]
    );
    return mapRow(rows[0]);
  },
  async summary() {
    const { rows } = await pq(
      'SELECT COUNT(*) FILTER (WHERE seen_at IS NULL)::int AS new_count, COUNT(*)::int AS total FROM quote_requests'
    );
    return { newCount: rows[0].new_count, total: rows[0].total };
  },
  async list(limit = MAX_LIST) {
    const { rows } = await pq(
      'SELECT * FROM quote_requests ORDER BY (seen_at IS NULL) DESC, created_at DESC, id DESC LIMIT $1',
      [Math.min(limit, MAX_LIST)]
    );
    return { quotes: rows.map(mapRow), ...(await this.summary()) };
  },
  async markSeen(ids) {
    const res = ids && ids.length
      ? await pq('UPDATE quote_requests SET seen_at = now() WHERE seen_at IS NULL AND id = ANY($1::bigint[])', [ids])
      : await pq('UPDATE quote_requests SET seen_at = now() WHERE seen_at IS NULL');
    return res.rowCount;
  },
  async remove(id) {
    const res = await pq('DELETE FROM quote_requests WHERE id = $1', [id]);
    return res.rowCount;
  },
};

// ---------------------------------------------------------------- SQLite fallback
const sqliteStore = {
  kind: 'sqlite',
  async create(q) {
    const d = db.getDb();
    const info = d.prepare(`
      INSERT INTO quote_requests (first_name, surname, mobile, email, product_id, product_name, message)
      VALUES (?,?,?,?,?,?,?)
    `).run(q.firstName, q.surname, q.mobile, q.email, q.productId, q.productName, q.message || null);
    return mapRow(d.prepare('SELECT * FROM quote_requests WHERE id=?').get(Number(info.lastInsertRowid)));
  },
  async summary() {
    const r = db.getDb().prepare(
      'SELECT SUM(CASE WHEN seen_at IS NULL THEN 1 ELSE 0 END) AS new_count, COUNT(*) AS total FROM quote_requests'
    ).get();
    return { newCount: Number(r.new_count || 0), total: Number(r.total || 0) };
  },
  async list(limit = MAX_LIST) {
    const rows = db.getDb().prepare(
      'SELECT * FROM quote_requests ORDER BY (seen_at IS NULL) DESC, created_at DESC, id DESC LIMIT ?'
    ).all(Math.min(limit, MAX_LIST));
    return { quotes: rows.map(mapRow), ...(await this.summary()) };
  },
  async markSeen(ids) {
    const d = db.getDb();
    const sql = "UPDATE quote_requests SET seen_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), is_read = 1, status = 'read', read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE seen_at IS NULL";
    if (ids && ids.length) {
      const stmt = d.prepare(`${sql} AND id = ?`);
      let n = 0;
      d.transaction(() => { for (const id of ids) n += stmt.run(id).changes; })();
      return n;
    }
    return d.prepare(sql).run().changes;
  },
  async remove(id) {
    return db.getDb().prepare('DELETE FROM quote_requests WHERE id = ?').run(id).changes;
  },
};

function store() {
  return pgUrl() ? pgStore : sqliteStore;
}

module.exports = {
  pgUrl,
  getPool,
  backend: () => store().kind,
  createQuote: (q) => store().create(q),
  quoteSummary: () => store().summary(),
  listQuotes: (limit) => store().list(limit),
  markQuotesSeen: (ids) => store().markSeen(ids),
  deleteQuote: (id) => store().remove(id),
};
