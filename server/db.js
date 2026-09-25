/**
 * SQLite persistence for CRB / Threadline ERP.
 * Local file: data/threadline.db (better-sqlite3).
 * Cloud-ready: same relational shape maps cleanly to Postgres later
 * (swap driver / DATABASE_URL; keep table names).
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const ROOT = path.join(__dirname, '..');
// On Vercel the deployment FS is read-only except /tmp — keep SQLite + uploads there.
const DB_DIR = process.env.VERCEL
  ? path.join('/tmp', 'threadline-data')
  : path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(DB_DIR, 'uploads', 'batches');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(DB_DIR, 'threadline.db');

let db;

function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
    seedIfNeeded(db);
  }
  return db;
}

function tableExists(database, name) {
  return !!database.prepare(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?"
  ).get(name);
}

function columnsOf(database, table) {
  return database.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
}

function migrate(database) {
  // Auth tables — keep compatibility with the existing starter schema
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'owner',
      phone TEXT,
      email TEXT,
      otp_enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS otp_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      code_hash TEXT,
      expires_at TEXT,
      verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      channel TEXT,
      destination TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT,
      ip TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      dept TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'internal',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS raw_materials (
      id TEXT PRIMARY KEY,
      cloth_name TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      purchase_date TEXT NOT NULL,
      bill_no TEXT,
      pcs REAL DEFAULT 0,
      meters REAL NOT NULL,
      rate_per_meter REAL NOT NULL,
      amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      distributed_m REAL NOT NULL DEFAULT 0,
      image_path TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      batch_id TEXT,
      item TEXT,
      dept TEXT,
      employee_id TEXT,
      qty_in REAL,
      unit_in TEXT,
      date_assigned TEXT,
      status TEXT,
      material_used REAL,
      pieces_produced REAL,
      date_completed TEXT,
      source_assignment_id TEXT,
      earnings REAL DEFAULT 0,
      material_returned INTEGER DEFAULT 0,
      material_return_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      employee_id TEXT PRIMARY KEY,
      paid REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dress_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('ladies','gents','kids')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dress_size_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dress_type_id INTEGER NOT NULL,
      size_label TEXT NOT NULL,
      measurements TEXT NOT NULL DEFAULT '{}',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(dress_type_id) REFERENCES dress_types(id) ON DELETE CASCADE
    );

    -- Garment products (same ids as the ERP item master: shirt, pant, ...).
    -- Only customer-facing fields live here; piece rates / cloth usage stay internal.
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      details TEXT,
      sizes TEXT,
      price REAL,
      image_url TEXT,
      featured INTEGER NOT NULL DEFAULT 0,
      tagline TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quote_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      surname TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      is_read INTEGER NOT NULL DEFAULT 0,
      read_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_quote_requests_created ON quote_requests(created_at DESC);

  `);

  if (tableExists(database, 'products')) {
    const pcols = columnsOf(database, 'products');
    if (!pcols.includes('image_url_2')) database.exec('ALTER TABLE products ADD COLUMN image_url_2 TEXT');
    if (!pcols.includes('image_alt')) database.exec('ALTER TABLE products ADD COLUMN image_alt TEXT');
    if (!pcols.includes('size_note')) database.exec('ALTER TABLE products ADD COLUMN size_note TEXT');
  }

  if (tableExists(database, 'users')) {
    const cols = columnsOf(database, 'users');
    if (!cols.includes('email')) database.exec('ALTER TABLE users ADD COLUMN email TEXT');
    if (!cols.includes('phone')) database.exec('ALTER TABLE users ADD COLUMN phone TEXT');
    if (!cols.includes('otp_enabled')) database.exec('ALTER TABLE users ADD COLUMN otp_enabled INTEGER NOT NULL DEFAULT 0');
  }
}

function todayOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + (days || 0));
  return d.toISOString().slice(0, 10);
}

function seedIfNeeded(database) {
  const admin = database.prepare('SELECT id FROM users WHERE username=?').get('admin');
  if (!admin) {
    const hash = bcrypt.hashSync('Threadline@123', 12);
    database.prepare(
      'INSERT INTO users(username, password_hash, role, otp_enabled) VALUES(?,?,?,0)'
    ).run('admin', hash, 'owner');
  }

  if (database.prepare('SELECT COUNT(*) AS c FROM suppliers').get().c === 0) {
    const ins = database.prepare('INSERT INTO suppliers(name) VALUES(?)');
    [
      'Mahaveer Textiles',
      'Surya Suiting & Shirting',
      'Akem Industry',
      'Ambika Suiting & Shirtings',
    ].forEach((name) => ins.run(name));
  }

  if (database.prepare('SELECT COUNT(*) AS c FROM employees').get().c === 0) {
    const ins = database.prepare(
      'INSERT INTO employees(id, name, dept, type, active) VALUES(?,?,?,?,1)'
    );
    const employees = [
      ['EMP-CUT-001', 'Ganesh', 'cutting', 'internal'],
      ['EMP-CUT-002', 'Suresh', 'cutting', 'internal'],
      ['EMP-STI-001', 'Ramesh', 'stitching', 'internal'],
      ['EMP-STI-002', 'Nagesh', 'stitching', 'internal'],
      ['EMP-KBV-001', 'Aditya', 'kbv', 'internal'],
      ['EMP-KBV-002', 'Sandeep', 'kbv', 'internal'],
      ['EMP-IRN-001', 'Sumit', 'ironing', 'internal'],
      ['EMP-IRN-002', 'Saching', 'ironing', 'internal'],
      ['EMP-PCK-001', 'Karan', 'packing', 'internal'],
      ['EMP-PCK-002', 'Pavan', 'packing', 'internal'],
      ['VEN-001', 'Om Garments Vendor', 'vendor', 'vendor'],
      ['VEN-002', 'Shree Uniform Works', 'vendor', 'vendor'],
    ];
    database.transaction(() => employees.forEach((e) => ins.run(...e)))();
  }

  if (database.prepare('SELECT COUNT(*) AS c FROM raw_materials').get().c === 0) {
    seedDemoErp(database);
  }

  if (database.prepare('SELECT COUNT(*) AS c FROM dress_types').get().c === 0) {
    seedDressSizes(database);
  }

  if (database.prepare('SELECT COUNT(*) AS c FROM products').get().c === 0) {
    seedProducts(database);
  }
  applyProductMedia(database);
}

// Seeded from the ERP item master (client ITEMS in erp.html) so the public
// catalogue and production use the same product ids and names.
const PRODUCT_SEED = [
  {
    id: 'shirt', name: 'Shirt', category: 'School Uniform', featured: 1,
    tagline: 'Crisp, durable uniform shirts for every season',
    description: 'Half and full sleeve uniform shirts in poly-cotton and oxford fabrics, stitched for daily wear and frequent washing.',
    details: 'Available in school and corporate colours. Custom pocket embroidery, logo badges and button colours on request. Suitable for bulk school and institutional orders.',
    sizes: '22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44',
  },
  {
    id: 'pant', name: 'Pant', category: 'School Uniform', featured: 1,
    tagline: 'Tailored uniform trousers built to last',
    description: 'Uniform trousers with reinforced seams, adjustable waist options and a clean, formal finish.',
    details: 'Terry-wool, poly-viscose and cotton blends. Elastic or belt-loop waist, single or double pleat. Bulk sizing charts available for schools.',
    sizes: '20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40',
  },
  {
    id: 'skirt', name: 'Skirt', category: 'School Uniform', featured: 1,
    tagline: 'Pleated and A-line skirts in school colours',
    description: 'Box-pleated and A-line uniform skirts with neat pleats that hold their shape wash after wash.',
    details: 'Checks and solids in poly-cotton and terry-wool. Side zip or elastic waist. Matching pinafores and ties can be supplied together.',
    sizes: '18, 20, 22, 24, 26, 28, 30, 32, 34',
  },
  {
    id: 'pinaco', name: 'Pinaco', category: 'Kids Wear', featured: 1,
    tagline: 'Comfortable pinafores for the youngest learners',
    description: 'Pinafore (pinaco) dresses for pre-primary and primary students, designed for comfort and easy dressing.',
    details: 'Soft, breathable fabric with adjustable straps or buttoned shoulders. Pair with our uniform shirts for a complete set.',
    sizes: '3–4Y, 5–6Y, 7–8Y, 9–10Y',
  },
  {
    id: 'grammer', name: 'Grammer', category: 'Kids Wear', featured: 0,
    tagline: 'Sturdy dungaree-style grammers',
    description: 'Grammer / dungaree-style uniform wear for young children, made for active school days.',
    details: 'Durable twill and poly-cotton fabrics with secure buttons and generous seam allowances for growing kids.',
    sizes: '3–4Y, 5–6Y, 7–8Y, 9–10Y',
  },
  {
    id: 'halfhastin', name: 'Half Hastin', category: 'School Uniform', featured: 0,
    tagline: 'Half-sleeve essentials',
    description: 'Half-sleeve (half hastin) uniform tops for warmer months and sports days.',
    details: 'Lightweight cotton-rich fabrics, colour-fast dyes and optional school crest printing or embroidery.',
    sizes: '22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44',
  },
  {
    id: 'bandi', name: 'Bandi', category: 'Ethnic & Occasion', featured: 1,
    tagline: 'Smart bandi jackets for events and uniforms',
    description: 'Sleeveless bandi (Nehru-style) jackets for school functions, staff uniforms and festive occasions.',
    details: 'Available in solid, textured and jacquard fabrics with contrast piping and custom buttons. Great for annual days and team uniforms.',
    sizes: '24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46',
  },
];

// Photos live in client/public/images (Unsplash License, see IMAGE_CREDITS.md).
// Older seeded values are listed so existing databases get upgraded in place.
const PRODUCT_MEDIA = {
  shirt: { img: '/images/shirt.webp', img2: '/images/shirt-2.webp', alt: 'White uniform shirts on wooden hangers', sizeNote: 'Chest size (in)', oldSizes: '22–46 (kids to adult)' },
  pant: { img: '/images/pant.webp', img2: '/images/pant-2.webp', alt: 'Grey tailored uniform trousers', sizeNote: 'Waist (in)', oldSizes: 'Waist 20–40' },
  skirt: { img: '/images/skirt.webp', img2: '/images/skirt-2.webp', alt: 'Navy and black pleated plaid skirt', sizeNote: 'Waist (in) — lengths on request', oldSizes: 'Waist 18–34, lengths on request' },
  pinaco: { img: '/images/pinaco.webp', img2: '/images/pinaco-2.webp', alt: 'Sleeveless pinafore-style dress on a hanger', sizeNote: 'Age', oldSizes: 'Ages 3–10' },
  grammer: { img: '/images/grammer.webp', img2: '/images/grammer-2.webp', alt: 'Denim dungaree-style overalls', sizeNote: 'Age', oldSizes: 'Ages 3–10' },
  halfhastin: { img: '/images/halfhastin.webp', img2: '/images/halfhastin-2.webp', alt: 'White half-sleeve shirt on a hanger', sizeNote: 'Chest size (in)', oldSizes: '22–44' },
  bandi: { img: '/images/bandi.webp', img2: '/images/bandi-2.webp', alt: 'Grey bandi (Nehru-style) jacket worn over a kurta', sizeNote: 'Chest size (in)', oldSizes: '24–46' },
};

function applyProductMedia(database) {
  const seedById = Object.fromEntries(PRODUCT_SEED.map((p) => [p.id, p]));
  const upd = database.prepare(`
    UPDATE products SET
      image_url = COALESCE(image_url, @img),
      image_url_2 = COALESCE(image_url_2, @img2),
      image_alt = COALESCE(image_alt, @alt),
      size_note = COALESCE(size_note, @sizeNote),
      sizes = CASE WHEN sizes IS NULL OR sizes = @oldSizes THEN @sizes ELSE sizes END
    WHERE id = @id
  `);
  database.transaction(() => {
    for (const [id, m] of Object.entries(PRODUCT_MEDIA)) {
      upd.run({ id, img: m.img, img2: m.img2, alt: m.alt, sizeNote: m.sizeNote, oldSizes: m.oldSizes, sizes: seedById[id] ? seedById[id].sizes : null });
    }
  })();
}

function seedProducts(database) {
  const ins = database.prepare(`
    INSERT INTO products(id, name, category, description, details, sizes, price, image_url, featured, tagline, sort_order, active)
    VALUES (?,?,?,?,?,?,NULL,NULL,?,?,?,1)
  `);
  database.transaction(() => {
    PRODUCT_SEED.forEach((p, i) => ins.run(
      p.id, p.name, p.category, p.description, p.details, p.sizes, p.featured, p.tagline, i + 1
    ));
  })();
}

// ---- Public catalogue (customer-safe fields only) ----
const PUBLIC_PRODUCT_COLUMNS = 'id, name, category, description, details, sizes, size_note, price, image_url, image_url_2, image_alt, featured, tagline';

function mapPublicProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description || '',
    details: row.details || '',
    sizes: row.sizes || '',
    sizeNote: row.size_note || '',
    price: row.price == null ? null : Number(row.price),
    imageUrl: row.image_url || null,
    imageUrl2: row.image_url_2 || null,
    imageAlt: row.image_alt || row.name,
    featured: !!row.featured,
    tagline: row.tagline || '',
  };
}

function listPublicProducts() {
  return getDb().prepare(
    `SELECT ${PUBLIC_PRODUCT_COLUMNS} FROM products WHERE active=1 ORDER BY sort_order, name COLLATE NOCASE`
  ).all().map(mapPublicProduct);
}

function getPublicProduct(id) {
  const row = getDb().prepare(
    `SELECT ${PUBLIC_PRODUCT_COLUMNS} FROM products WHERE id=? AND active=1`
  ).get(String(id));
  return row ? mapPublicProduct(row) : null;
}

// ---- Quote requests ----
function sqliteUtcToIso(ts) {
  if (!ts) return null;
  return /Z$|[+-]\d\d:?\d\d$/.test(ts) ? ts : `${String(ts).replace(' ', 'T')}Z`;
}

function mapQuote(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    surname: row.surname,
    mobile: row.mobile,
    email: row.email,
    productId: row.product_id,
    productName: row.product_name,
    status: row.status,
    isRead: !!row.is_read,
    readAt: sqliteUtcToIso(row.read_at),
    createdAt: sqliteUtcToIso(row.created_at),
  };
}

function createQuoteRequest(q) {
  const info = getDb().prepare(`
    INSERT INTO quote_requests(first_name, surname, mobile, email, product_id, product_name)
    VALUES (?,?,?,?,?,?)
  `).run(q.firstName, q.surname, q.mobile, q.email, q.productId, q.productName);
  return mapQuote(getDb().prepare('SELECT * FROM quote_requests WHERE id=?').get(Number(info.lastInsertRowid)));
}

function listQuoteRequests(limit = 200) {
  const database = getDb();
  const quotes = database.prepare(
    'SELECT * FROM quote_requests ORDER BY created_at DESC, id DESC LIMIT ?'
  ).all(limit).map(mapQuote);
  const unreadCount = database.prepare('SELECT COUNT(*) AS c FROM quote_requests WHERE is_read=0').get().c;
  const total = database.prepare('SELECT COUNT(*) AS c FROM quote_requests').get().c;
  return { quotes, unreadCount, total };
}

function markQuoteRead(id) {
  const database = getDb();
  const info = database.prepare(
    "UPDATE quote_requests SET is_read=1, status=CASE WHEN status='new' THEN 'read' ELSE status END, read_at=COALESCE(read_at, CURRENT_TIMESTAMP) WHERE id=?"
  ).run(id);
  if (!info.changes) {
    const err = new Error('Quote request not found');
    err.status = 404;
    throw err;
  }
  return mapQuote(database.prepare('SELECT * FROM quote_requests WHERE id=?').get(id));
}

function markAllQuotesRead() {
  const info = getDb().prepare(
    "UPDATE quote_requests SET is_read=1, status=CASE WHEN status='new' THEN 'read' ELSE status END, read_at=COALESCE(read_at, CURRENT_TIMESTAMP) WHERE is_read=0"
  ).run();
  return info.changes;
}

function seedDemoErp(database) {
  const insertBatch = database.prepare(`
    INSERT INTO raw_materials(
      id, cloth_name, supplier_name, purchase_date, bill_no, pcs, meters,
      rate_per_meter, amount, paid_amount, distributed_m, image_path
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,NULL)
  `);
  const insertAssign = database.prepare(`
    INSERT INTO assignments(
      id, batch_id, item, dept, employee_id, qty_in, unit_in, date_assigned, status,
      material_used, pieces_produced, date_completed, source_assignment_id, earnings,
      material_returned, material_return_date
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  // Piece rates aligned with client ITEMS
  const rates = {
    shirt: { cutting: 8, stitching: 12, kbv: 4, ironing: 3, packing: 2, vendor: 26 },
    pant: { cutting: 10, stitching: 14, kbv: 5, ironing: 3, packing: 2, vendor: 30 },
    skirt: { cutting: 9, stitching: 13, kbv: 4, ironing: 3, packing: 2, vendor: 27 },
    bandi: { cutting: 6, stitching: 8, kbv: 3, ironing: 2, packing: 2, vendor: 18 },
    grammer: { cutting: 7, stitching: 10, kbv: 3, ironing: 2, packing: 2, vendor: 21 },
  };
  const earn = (item, dept, pcs) => {
    const r = rates[item];
    if (!r || pcs == null) return 0;
    return pcs * (dept === 'vendor' ? r.vendor : (r[dept] || 0));
  };

  const batches = [
    { id: 'B001', cloth: 'School Time Cloth', supplier: 'Mahaveer Textiles', date: todayOffset(-9), bill: 'MH-2291', pcs: 12, meters: 248.8, rate: 65, paid: 16172 },
    { id: 'B002', cloth: 'Oxford Blue Poly-Cotton', supplier: 'Surya Suiting & Shirting', date: todayOffset(-6), bill: 'SS-1187', pcs: 9, meters: 180, rate: 72, paid: 9000 },
    { id: 'B003', cloth: 'Navy Terry Wool', supplier: 'Akem Industry', date: todayOffset(-4), bill: 'AK-5560', pcs: 14, meters: 210, rate: 110, paid: 0 },
    { id: 'B004', cloth: 'Grey Check Uniform Fabric', supplier: 'Ambika Suiting & Shirtings', date: todayOffset(-2), bill: 'AM-3342', pcs: 10, meters: 160, rate: 58, paid: 9280 },
  ];

  // distributed_m only grows for cutting/vendor issues (matches client createAssignment)
  const distributed = { B001: 150, B002: 0, B003: 60, B004: 78 };

  const assignments = [
    ['WA-0001', 'B001', 'shirt', 'cutting', 'EMP-CUT-001', 100, 'meters', todayOffset(-8), 'forwarded', 80, 8, todayOffset(-7), null, earn('shirt', 'cutting', 8), 0, null],
    ['WA-0002', 'B001', 'shirt', 'stitching', 'EMP-STI-001', 8, 'pieces', todayOffset(-7), 'forwarded', null, 6, todayOffset(-6), 'WA-0001', earn('shirt', 'stitching', 6), 0, null],
    ['WA-0003', 'B001', 'shirt', 'kbv', 'EMP-KBV-001', 6, 'pieces', todayOffset(-6), 'forwarded', null, 6, todayOffset(-5), 'WA-0002', earn('shirt', 'kbv', 6), 0, null],
    ['WA-0004', 'B001', 'shirt', 'ironing', 'EMP-IRN-001', 6, 'pieces', todayOffset(-5), 'forwarded', null, 6, todayOffset(-4), 'WA-0003', earn('shirt', 'ironing', 6), 0, null],
    ['WA-0005', 'B001', 'shirt', 'packing', 'EMP-PCK-001', 6, 'pieces', todayOffset(-4), 'ready', null, 6, todayOffset(-3), 'WA-0004', earn('shirt', 'packing', 6), 0, null],
    ['WA-0006', 'B001', 'pant', 'cutting', 'EMP-CUT-002', 50, 'meters', todayOffset(-3), 'completed', 45, 30, todayOffset(-2), null, earn('pant', 'cutting', 30), 0, null],
    ['WA-0007', 'B002', 'shirt', 'stitching', 'EMP-STI-002', 14, 'pieces', todayOffset(-1), 'in-progress', null, null, null, null, 0, 0, null],
    ['WA-0008', 'B002', 'shirt', 'kbv', 'EMP-KBV-002', 10, 'pieces', todayOffset(-2), 'completed', null, 10, todayOffset(-1), null, earn('shirt', 'kbv', 10), 0, null],
    ['WA-0009', 'B002', 'pant', 'ironing', 'EMP-IRN-002', 12, 'pieces', todayOffset(-4), 'in-progress', null, null, null, null, 0, 0, null],
    ['WA-0010', 'B003', 'skirt', 'packing', 'EMP-PCK-002', 18, 'pieces', todayOffset(-2), 'ready', null, 18, todayOffset(-1), null, earn('skirt', 'packing', 18), 0, null],
    ['WA-0011', 'B003', 'bandi', 'vendor', 'VEN-001', 60, 'meters', todayOffset(-5), 'completed', 54, 62, todayOffset(-2), null, earn('bandi', 'vendor', 62), 0, null],
    ['WA-0012', 'B004', 'grammer', 'vendor', 'VEN-002', 40, 'meters', todayOffset(-1), 'in-progress', null, null, null, null, 0, 0, null],
    ['WA-0013', 'B004', 'grammer', 'cutting', 'EMP-CUT-001', 38, 'meters', todayOffset(-1), 'in-progress', null, null, null, null, 0, 0, null],
  ];

  database.transaction(() => {
    batches.forEach((b) => {
      const amount = Math.round(b.meters * b.rate);
      insertBatch.run(
        b.id, b.cloth, b.supplier, b.date, b.bill, b.pcs, b.meters, b.rate, amount, b.paid,
        distributed[b.id] || 0
      );
    });
    assignments.forEach((row) => insertAssign.run(...row));
    database.prepare('INSERT OR REPLACE INTO app_meta(key, value) VALUES(?,?)').run('seq_batch', '4');
    database.prepare('INSERT OR REPLACE INTO app_meta(key, value) VALUES(?,?)').run('seq_assign', '13');
  })();
}

function seedDressSizes(database) {
  const insType = database.prepare(
    'INSERT INTO dress_types(name, category, notes) VALUES(?,?,?)'
  );
  const insSize = database.prepare(
    'INSERT INTO dress_size_entries(dress_type_id, size_label, measurements, notes) VALUES(?,?,?,?)'
  );
  const tx = database.transaction(() => {
    const samples = [
      {
        name: 'Ladies Kurti',
        category: 'ladies',
        notes: 'Straight kurti — note chest & length carefully',
        sizes: [
          { label: 'S', m: { chest: 36, waist: 32, hip: 38, length: 40, shoulder: 14, sleeve: 17 } },
          { label: 'M', m: { chest: 38, waist: 34, hip: 40, length: 42, shoulder: 14.5, sleeve: 17.5 } },
          { label: 'L', m: { chest: 40, waist: 36, hip: 42, length: 44, shoulder: 15, sleeve: 18 } },
        ],
      },
      {
        name: 'Ladies Salwar Suit',
        category: 'ladies',
        notes: 'Kameez + salwar set',
        sizes: [
          { label: 'M', m: { chest: 38, waist: 34, hip: 40, length: 42, shoulder: 14.5, sleeve: 18 } },
          { label: 'XL', m: { chest: 42, waist: 38, hip: 44, length: 45, shoulder: 15.5, sleeve: 18.5 } },
        ],
      },
      {
        name: 'Gents Shirt',
        category: 'gents',
        notes: 'Full sleeve formal shirt',
        sizes: [
          { label: '38', m: { chest: 38, waist: 34, length: 28, shoulder: 17, sleeve: 24 } },
          { label: '40', m: { chest: 40, waist: 36, length: 29, shoulder: 17.5, sleeve: 24.5 } },
          { label: '42', m: { chest: 42, waist: 38, length: 30, shoulder: 18, sleeve: 25 } },
        ],
      },
      {
        name: 'Gents Pant',
        category: 'gents',
        notes: 'Trouser — waist & inseam',
        sizes: [
          { label: '30', m: { waist: 30, hip: 36, length: 40, inseam: 30 } },
          { label: '32', m: { waist: 32, hip: 38, length: 41, inseam: 31 } },
          { label: '34', m: { waist: 34, hip: 40, length: 42, inseam: 32 } },
        ],
      },
      {
        name: 'Kids Uniform Shirt',
        category: 'kids',
        notes: 'School shirt ages ~6–10',
        sizes: [
          { label: '6Y', m: { chest: 26, length: 20, shoulder: 11, sleeve: 14 } },
          { label: '8Y', m: { chest: 28, length: 22, shoulder: 12, sleeve: 15 } },
          { label: '10Y', m: { chest: 30, length: 24, shoulder: 12.5, sleeve: 16 } },
        ],
      },
      {
        name: 'Kids Frock',
        category: 'kids',
        notes: 'A-line frock',
        sizes: [
          { label: 'S', m: { chest: 24, waist: 22, length: 22, shoulder: 10 } },
          { label: 'M', m: { chest: 26, waist: 24, length: 24, shoulder: 11 } },
        ],
      },
    ];
    for (const s of samples) {
      const info = insType.run(s.name, s.category, s.notes);
      const typeId = Number(info.lastInsertRowid);
      for (const sz of s.sizes) {
        insSize.run(typeId, sz.label, JSON.stringify(sz.m), null);
      }
    }
  });
  tx();
}

function parseMeasurements(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

function mapSizeEntry(row) {
  return {
    id: row.id,
    dressTypeId: row.dress_type_id,
    sizeLabel: row.size_label,
    measurements: parseMeasurements(row.measurements),
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDressType(row, sizes) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    notes: row.notes || '',
    createdAt: row.created_at,
    sizes: (sizes || []).map(mapSizeEntry),
  };
}

function listDressTypes(category) {
  const database = getDb();
  let types;
  if (category) {
    types = database.prepare(
      'SELECT * FROM dress_types WHERE category=? ORDER BY name COLLATE NOCASE'
    ).all(category);
  } else {
    types = database.prepare(
      'SELECT * FROM dress_types ORDER BY category, name COLLATE NOCASE'
    ).all();
  }
  const sizeStmt = database.prepare(
    'SELECT * FROM dress_size_entries WHERE dress_type_id=? ORDER BY id'
  );
  return types.map((t) => mapDressType(t, sizeStmt.all(t.id)));
}

function getDressType(id) {
  const database = getDb();
  const row = database.prepare('SELECT * FROM dress_types WHERE id=?').get(id);
  if (!row) return null;
  const sizes = database.prepare(
    'SELECT * FROM dress_size_entries WHERE dress_type_id=? ORDER BY id'
  ).all(id);
  return mapDressType(row, sizes);
}

function createDressType(payload) {
  const name = String(payload.name || '').trim();
  const category = String(payload.category || '').trim().toLowerCase();
  if (!name) {
    const err = new Error('Dress name is required');
    err.status = 400;
    throw err;
  }
  if (!['ladies', 'gents', 'kids'].includes(category)) {
    const err = new Error('Category must be ladies, gents, or kids');
    err.status = 400;
    throw err;
  }
  const info = getDb().prepare(
    'INSERT INTO dress_types(name, category, notes) VALUES(?,?,?)'
  ).run(name, category, payload.notes || null);
  return getDressType(Number(info.lastInsertRowid));
}

function updateDressType(id, payload) {
  const existing = getDb().prepare('SELECT * FROM dress_types WHERE id=?').get(id);
  if (!existing) {
    const err = new Error('Dress type not found');
    err.status = 404;
    throw err;
  }
  const name = payload.name != null ? String(payload.name).trim() : existing.name;
  let category = payload.category != null ? String(payload.category).trim().toLowerCase() : existing.category;
  if (!name) {
    const err = new Error('Dress name is required');
    err.status = 400;
    throw err;
  }
  if (!['ladies', 'gents', 'kids'].includes(category)) {
    const err = new Error('Category must be ladies, gents, or kids');
    err.status = 400;
    throw err;
  }
  const notes = payload.notes != null ? payload.notes : existing.notes;
  getDb().prepare(
    'UPDATE dress_types SET name=?, category=?, notes=? WHERE id=?'
  ).run(name, category, notes, id);
  return getDressType(id);
}

function deleteDressType(id) {
  const info = getDb().prepare('DELETE FROM dress_types WHERE id=?').run(id);
  if (!info.changes) {
    const err = new Error('Dress type not found');
    err.status = 404;
    throw err;
  }
  return { ok: true };
}

function createDressSize(dressTypeId, payload) {
  const type = getDb().prepare('SELECT id FROM dress_types WHERE id=?').get(dressTypeId);
  if (!type) {
    const err = new Error('Dress type not found');
    err.status = 404;
    throw err;
  }
  const label = String(payload.sizeLabel || payload.label || '').trim();
  if (!label) {
    const err = new Error('Size label is required');
    err.status = 400;
    throw err;
  }
  const measurements = payload.measurements && typeof payload.measurements === 'object'
    ? payload.measurements
    : {};
  const info = getDb().prepare(
    'INSERT INTO dress_size_entries(dress_type_id, size_label, measurements, notes) VALUES(?,?,?,?)'
  ).run(dressTypeId, label, JSON.stringify(measurements), payload.notes || null);
  const row = getDb().prepare('SELECT * FROM dress_size_entries WHERE id=?').get(Number(info.lastInsertRowid));
  return mapSizeEntry(row);
}

function updateDressSize(id, payload) {
  const existing = getDb().prepare('SELECT * FROM dress_size_entries WHERE id=?').get(id);
  if (!existing) {
    const err = new Error('Size entry not found');
    err.status = 404;
    throw err;
  }
  const label = payload.sizeLabel != null || payload.label != null
    ? String(payload.sizeLabel || payload.label || '').trim()
    : existing.size_label;
  if (!label) {
    const err = new Error('Size label is required');
    err.status = 400;
    throw err;
  }
  const measurements = payload.measurements && typeof payload.measurements === 'object'
    ? payload.measurements
    : parseMeasurements(existing.measurements);
  const notes = payload.notes != null ? payload.notes : existing.notes;
  getDb().prepare(
    `UPDATE dress_size_entries
     SET size_label=?, measurements=?, notes=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=?`
  ).run(label, JSON.stringify(measurements), notes, id);
  const row = getDb().prepare('SELECT * FROM dress_size_entries WHERE id=?').get(id);
  return mapSizeEntry(row);
}

function deleteDressSize(id) {
  const info = getDb().prepare('DELETE FROM dress_size_entries WHERE id=?').run(id);
  if (!info.changes) {
    const err = new Error('Size entry not found');
    err.status = 404;
    throw err;
  }
  return { ok: true };
}


function getMeta(key, fallback) {
  const row = getDb().prepare('SELECT value FROM app_meta WHERE key=?').get(key);
  return row ? row.value : fallback;
}

function setMeta(key, value) {
  getDb().prepare('INSERT OR REPLACE INTO app_meta(key, value) VALUES(?,?)').run(key, String(value));
}

function nextBatchId() {
  const n = parseInt(getMeta('seq_batch', '0'), 10) + 1;
  setMeta('seq_batch', n);
  return 'B' + String(n).padStart(3, '0');
}

function nextAssignId() {
  const n = parseInt(getMeta('seq_assign', '0'), 10) + 1;
  setMeta('seq_assign', n);
  return 'WA-' + String(n).padStart(4, '0');
}

function mapBatch(row) {
  if (!row) return null;
  const amount = row.amount;
  const paidAmount = row.paid_amount;
  let imageUrl = null;
  if (row.image_path) {
    const base = path.basename(row.image_path);
    imageUrl = `/api/uploads/batches/${base}`;
  }
  return {
    id: row.id,
    clothName: row.cloth_name,
    supplier: row.supplier_name,
    purchaseDate: row.purchase_date,
    billNo: row.bill_no,
    pcs: row.pcs,
    meters: row.meters,
    ratePerMeter: row.rate_per_meter,
    amount,
    paidAmount,
    pendingAmount: amount - paidAmount,
    distributedM: row.distributed_m,
    imageUrl,
  };
}

function mapAssignment(row) {
  return {
    id: row.id,
    batchId: row.batch_id,
    item: row.item,
    dept: row.dept,
    employeeId: row.employee_id,
    qtyIn: row.qty_in,
    unitIn: row.unit_in,
    dateAssigned: row.date_assigned,
    status: row.status,
    materialUsed: row.material_used,
    piecesProduced: row.pieces_produced,
    dateCompleted: row.date_completed,
    sourceAssignmentId: row.source_assignment_id,
    earnings: row.earnings || 0,
    materialReturned: !!row.material_returned,
    materialReturnDate: row.material_return_date,
  };
}

function mapEmployee(row) {
  return {
    id: row.id,
    name: row.name,
    dept: row.dept,
    type: row.type,
    active: !!row.active,
  };
}

function getBootstrap() {
  const database = getDb();
  const suppliers = database.prepare('SELECT id, name FROM suppliers ORDER BY name COLLATE NOCASE').all();
  const employees = database.prepare('SELECT * FROM employees ORDER BY id').all().map(mapEmployee);
  const batches = database.prepare('SELECT * FROM raw_materials ORDER BY id').all().map(mapBatch);
  const assignments = database.prepare('SELECT * FROM assignments ORDER BY id').all().map(mapAssignment);
  const payments = {};
  database.prepare('SELECT employee_id, paid FROM payments').all().forEach((p) => {
    payments[p.employee_id] = { paid: p.paid };
  });
  return {
    suppliers: suppliers.map((s) => s.name),
    supplierRecords: suppliers,
    employees,
    batches,
    assignments,
    payments,
    dressTypes: listDressTypes(),
    seq: {
      batch: parseInt(getMeta('seq_batch', String(batches.length)), 10),
      assign: parseInt(getMeta('seq_assign', String(assignments.length)), 10),
    },
  };
}

function listSuppliers() {
  return getDb()
    .prepare('SELECT id, name, created_at AS createdAt FROM suppliers ORDER BY name COLLATE NOCASE')
    .all();
}

function createSupplier(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) {
    const err = new Error('Company name is required');
    err.status = 400;
    throw err;
  }
  try {
    const info = getDb().prepare('INSERT INTO suppliers(name) VALUES(?)').run(trimmed);
    return { id: Number(info.lastInsertRowid), name: trimmed };
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      const existing = getDb()
        .prepare('SELECT id, name FROM suppliers WHERE name = ? COLLATE NOCASE')
        .get(trimmed);
      if (existing) return existing;
      const e = new Error('Supplier already exists');
      e.status = 409;
      throw e;
    }
    throw err;
  }
}

function saveImageDataUrl(batchId, dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    const err = new Error('Invalid image data');
    err.status = 400;
    throw err;
  }
  const mime = match[1];
  const extMap = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  const ext = extMap[mime] || 'png';
  const buf = Buffer.from(match[2], 'base64');
  if (buf.length > 8 * 1024 * 1024) {
    const err = new Error('Image too large (max 8MB)');
    err.status = 400;
    throw err;
  }
  const filename = `${batchId}.${ext}`;
  for (const old of fs.readdirSync(UPLOAD_DIR)) {
    if (old.startsWith(`${batchId}.`)) fs.unlinkSync(path.join(UPLOAD_DIR, old));
  }
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buf);
  return path.join('uploads', 'batches', filename);
}

function createBatch(payload) {
  const database = getDb();
  const id = payload.id || nextBatchId();
  const meters = Number(payload.meters) || 0;
  const rate = Number(payload.ratePerMeter) || 0;
  const amount = Math.round(meters * rate);
  const paidAmount = Number(payload.paidAmount) || 0;
  let imagePath = null;
  if (payload.imageDataUrl) imagePath = saveImageDataUrl(id, payload.imageDataUrl);
  else if (payload.imagePath) imagePath = payload.imagePath;

  const supplier = String(payload.supplier || '').trim();
  if (supplier) {
    try { createSupplier(supplier); } catch (_) { /* ignore */ }
  }

  database.prepare(`
    INSERT INTO raw_materials(
      id, cloth_name, supplier_name, purchase_date, bill_no, pcs, meters,
      rate_per_meter, amount, paid_amount, distributed_m, image_path
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id,
    payload.clothName || 'Unnamed Cloth',
    supplier || 'Unknown',
    payload.purchaseDate || todayOffset(0),
    payload.billNo || '—',
    Number(payload.pcs) || 0,
    meters,
    rate,
    amount,
    paidAmount,
    Number(payload.distributedM) || 0,
    imagePath
  );

  return mapBatch(database.prepare('SELECT * FROM raw_materials WHERE id=?').get(id));
}

function updateBatchImage(batchId, dataUrl) {
  const database = getDb();
  const row = database.prepare('SELECT * FROM raw_materials WHERE id=?').get(batchId);
  if (!row) {
    const err = new Error('Batch not found');
    err.status = 404;
    throw err;
  }
  const imagePath = saveImageDataUrl(batchId, dataUrl);
  database.prepare('UPDATE raw_materials SET image_path=? WHERE id=?').run(imagePath, batchId);
  return mapBatch(database.prepare('SELECT * FROM raw_materials WHERE id=?').get(batchId));
}

function updateBatchDistributed(batchId, distributedM) {
  getDb().prepare('UPDATE raw_materials SET distributed_m=? WHERE id=?').run(distributedM, batchId);
}

function createEmployee(payload) {
  const database = getDb();
  const id = payload.id || `EMP-${Date.now()}`;
  database.prepare(
    'INSERT INTO employees(id, name, dept, type, active) VALUES(?,?,?,?,?)'
  ).run(id, payload.name, payload.dept, payload.type || 'internal', payload.active === false ? 0 : 1);
  return mapEmployee(database.prepare('SELECT * FROM employees WHERE id=?').get(id));
}

function upsertAssignment(a) {
  getDb().prepare(`
    INSERT INTO assignments(
      id, batch_id, item, dept, employee_id, qty_in, unit_in, date_assigned, status,
      material_used, pieces_produced, date_completed, source_assignment_id, earnings,
      material_returned, material_return_date
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      batch_id=excluded.batch_id,
      item=excluded.item,
      dept=excluded.dept,
      employee_id=excluded.employee_id,
      qty_in=excluded.qty_in,
      unit_in=excluded.unit_in,
      date_assigned=excluded.date_assigned,
      status=excluded.status,
      material_used=excluded.material_used,
      pieces_produced=excluded.pieces_produced,
      date_completed=excluded.date_completed,
      source_assignment_id=excluded.source_assignment_id,
      earnings=excluded.earnings,
      material_returned=excluded.material_returned,
      material_return_date=excluded.material_return_date
  `).run(
    a.id, a.batchId, a.item, a.dept, a.employeeId, a.qtyIn, a.unitIn, a.dateAssigned, a.status,
    a.materialUsed, a.piecesProduced, a.dateCompleted, a.sourceAssignmentId, a.earnings || 0,
    a.materialReturned ? 1 : 0, a.materialReturnDate
  );
}

function setPayment(employeeId, paid) {
  getDb().prepare(
    'INSERT INTO payments(employee_id, paid) VALUES(?,?) ON CONFLICT(employee_id) DO UPDATE SET paid=excluded.paid'
  ).run(employeeId, paid);
}

function findUserByUsername(username) {
  return getDb().prepare('SELECT * FROM users WHERE username=?').get(username);
}

function findUserById(id) {
  return getDb().prepare(
    'SELECT id, username, role, otp_enabled AS otpEnabled, phone, email FROM users WHERE id=?'
  ).get(id);
}

function audit(userId, action, ip) {
  getDb().prepare('INSERT INTO audit_log(user_id, action, ip) VALUES(?,?,?)').run(userId, action, ip || '');
}

function listAudit(limit = 100) {
  return getDb().prepare(
    'SELECT id, user_id, action, ip, created_at FROM audit_log ORDER BY id DESC LIMIT ?'
  ).all(limit);
}

function resolveUploadPath(filename) {
  const safe = path.basename(filename);
  const abs = path.join(UPLOAD_DIR, safe);
  if (!abs.startsWith(UPLOAD_DIR)) return null;
  if (!fs.existsSync(abs)) return null;
  return abs;
}

module.exports = {
  getDb,
  getBootstrap,
  listSuppliers,
  createSupplier,
  createBatch,
  updateBatchImage,
  updateBatchDistributed,
  createEmployee,
  upsertAssignment,
  setPayment,
  nextBatchId,
  nextAssignId,
  mapBatch,
  findUserByUsername,
  findUserById,
  audit,
  listAudit,
  resolveUploadPath,
  listDressTypes,
  getDressType,
  createDressType,
  updateDressType,
  deleteDressType,
  createDressSize,
  updateDressSize,
  deleteDressSize,
  listPublicProducts,
  getPublicProduct,
  createQuoteRequest,
  listQuoteRequests,
  markQuoteRead,
  markAllQuotesRead,
  UPLOAD_DIR,
  DB_PATH,
};
