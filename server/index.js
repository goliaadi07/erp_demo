const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const quotes = require('./quotes-store');
const sizeCharts = require('./size-charts-store');

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET_BEFORE_PRODUCTION';
const ROOT = path.join(__dirname, '..');

// Ensure DB + seed on boot
db.getDb();

const app = express();
app.use(cors());
app.use(express.json({ limit: '12mb' }));

function tokenFor(u) {
  return jwt.sign(
    { sub: u.id, username: u.username, role: u.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!t) return res.status(401).json({ message: 'Authentication required' });
  try {
    req.auth = jwt.verify(t, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired or invalid' });
  }
}

function optionalAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (t) {
    try { req.auth = jwt.verify(t, JWT_SECRET); } catch { /* ignore */ }
  }
  next();
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'threadline-api', db: path.basename(db.DB_PATH), quotesBackend: quotes.backend() });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  const u = db.findUserByUsername(username);
  if (!u || !bcrypt.compareSync(password, u.password_hash)) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }
  db.audit(u.id, 'LOGIN', req.ip);
  res.json({
    token: tokenFor(u),
    user: {
      id: u.id,
      username: u.username,
      role: u.role,
      otpEnabled: !!u.otp_enabled,
    },
  });
});

app.get('/api/auth/me', auth, (req, res) => {
  const u = db.findUserById(req.auth.sub);
  if (!u) return res.status(401).json({ message: 'User not found' });
  res.json({ user: u });
});

// OTP scaffold — phone/email columns exist; delivery not wired yet
app.post('/api/auth/request-otp', auth, (req, res) => {
  res.status(501).json({
    message: 'OTP delivery is scaffolded (users.phone/email + otp_requests) but not connected to SMS/email yet.',
  });
});
app.post('/api/auth/verify-otp', auth, (req, res) => {
  res.status(501).json({ message: 'OTP verification endpoint reserved for the next phase.' });
});
app.get('/api/auth/audit', auth, (req, res) => {
  if (req.auth.role !== 'owner') return res.status(403).json({ message: 'Forbidden' });
  res.json({ rows: db.listAudit(100) });
});

// ---- ERP bootstrap & resources ----
app.get('/api/erp/bootstrap', optionalAuth, (req, res) => {
  res.json(db.getBootstrap());
});

app.get('/api/suppliers', optionalAuth, (req, res) => {
  res.json({ suppliers: db.listSuppliers() });
});

app.post('/api/suppliers', auth, (req, res) => {
  try {
    const supplier = db.createSupplier(req.body && req.body.name);
    res.status(201).json({ supplier });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to create supplier' });
  }
});

app.get('/api/batches', optionalAuth, (req, res) => {
  res.json({ batches: db.getBootstrap().batches });
});

app.post('/api/batches', auth, (req, res) => {
  try {
    const batch = db.createBatch(req.body || {});
    res.status(201).json({ batch });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to create batch' });
  }
});

app.post('/api/batches/:id/image', auth, (req, res) => {
  try {
    const batch = db.updateBatchImage(req.params.id, req.body && req.body.imageDataUrl);
    res.json({ batch });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to upload image' });
  }
});

app.patch('/api/batches/:id', auth, (req, res) => {
  try {
    if (req.body && req.body.distributedM != null) {
      db.updateBatchDistributed(req.params.id, Number(req.body.distributedM) || 0);
    }
    const row = db.getDb().prepare('SELECT * FROM raw_materials WHERE id=?').get(req.params.id);
    if (!row) return res.status(404).json({ message: 'Batch not found' });
    res.json({ batch: db.mapBatch(row) });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to update batch' });
  }
});

app.post('/api/employees', auth, (req, res) => {
  try {
    const employee = db.createEmployee(req.body || {});
    res.status(201).json({ employee });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to create employee' });
  }
});

app.put('/api/assignments/:id', auth, (req, res) => {
  try {
    const a = { ...(req.body || {}), id: req.params.id };
    if (!a.id) return res.status(400).json({ message: 'Assignment id required' });
    db.upsertAssignment(a);
    res.json({ ok: true, id: a.id });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to save assignment' });
  }
});

app.post('/api/assignments', auth, (req, res) => {
  try {
    const a = { ...(req.body || {}) };
    if (!a.id) a.id = db.nextAssignId();
    db.upsertAssignment(a);
    res.status(201).json({ assignment: a });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to create assignment' });
  }
});

app.put('/api/payments/:employeeId', auth, (req, res) => {
  db.setPayment(req.params.employeeId, Number(req.body && req.body.paid) || 0);
  res.json({ ok: true });
});

app.get('/api/meta/next-ids', auth, (req, res) => {
  res.json({
    batchId: db.nextBatchId(),
    // peek without consuming assign — clients usually allocate via POST /assignments
  });
});


// ---- Dress size notes (Ladies / Gents / Kids) ----
app.get('/api/dress-types', optionalAuth, (req, res) => {
  const category = req.query.category || null;
  res.json({ dressTypes: db.listDressTypes(category) });
});

app.post('/api/dress-types', auth, (req, res) => {
  try {
    const dressType = db.createDressType(req.body || {});
    res.status(201).json({ dressType });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to create dress type' });
  }
});

app.patch('/api/dress-types/:id', auth, (req, res) => {
  try {
    const dressType = db.updateDressType(Number(req.params.id), req.body || {});
    res.json({ dressType });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to update dress type' });
  }
});

app.delete('/api/dress-types/:id', auth, (req, res) => {
  try {
    db.deleteDressType(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to delete dress type' });
  }
});

app.post('/api/dress-types/:id/sizes', auth, (req, res) => {
  try {
    const size = db.createDressSize(Number(req.params.id), req.body || {});
    res.status(201).json({ size });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to add size' });
  }
});

app.patch('/api/dress-sizes/:id', auth, (req, res) => {
  try {
    const size = db.updateDressSize(Number(req.params.id), req.body || {});
    res.json({ size });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to update size' });
  }
});

app.delete('/api/dress-sizes/:id', auth, (req, res) => {
  try {
    db.deleteDressSize(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to delete size' });
  }
});

// ---- Garment size charts (dashboard "Dress Sizes") ----
app.get('/api/size-charts', auth, async (req, res) => {
  try {
    res.json({ charts: await sizeCharts.listCharts(), backend: sizeCharts.backend() });
  } catch (err) {
    console.error('[size-charts] list failed:', err.message);
    res.status(500).json({ message: 'Size charts are unavailable right now' });
  }
});
app.put('/api/size-charts/:id', auth, async (req, res) => {
  try {
    res.json({ chart: await sizeCharts.saveChart(String(req.params.id), req.body || {}) });
  } catch (err) {
    if (!err.status) console.error('[size-charts] save failed:', err.message);
    res.status(err.status || 500).json({ message: err.status ? err.message : 'Could not save the size chart' });
  }
});
app.delete('/api/size-charts/:id', auth, async (req, res) => {
  try {
    res.json({ ok: true, deleted: await sizeCharts.deleteChart(String(req.params.id)) });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.status ? err.message : 'Could not delete the size chart' });
  }
});

// ---- Public customer website API (no login) ----
// Only customer-safe product fields are exposed (see db.listPublicProducts).
app.get('/api/public/products', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ products: db.listPublicProducts() });
});

app.get('/api/public/products/:id', (req, res) => {
  const product = db.getPublicProduct(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ product });
});

const QUOTE_MESSAGE_MAX = 600;
const QUOTE_LIMITS = { firstName: 60, surname: 60, mobile: 20, email: 120, productId: 40 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOBILE_RE = /^\+?[0-9\s\-().]{7,20}$/;
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'\-]*$/u;

function validateQuote(body) {
  const errors = {};
  const clean = {};
  for (const key of Object.keys(QUOTE_LIMITS)) {
    const raw = body[key];
    const v = typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : '';
    clean[key] = v;
    if (!v) errors[key] = 'This field is required';
    else if (v.length > QUOTE_LIMITS[key]) errors[key] = `Must be at most ${QUOTE_LIMITS[key]} characters`;
  }
  if (!errors.firstName && !NAME_RE.test(clean.firstName)) errors.firstName = 'Please enter a valid first name';
  if (!errors.surname && !NAME_RE.test(clean.surname)) errors.surname = 'Please enter a valid surname';
  if (!errors.email && !EMAIL_RE.test(clean.email)) errors.email = 'Please enter a valid email address';
  if (!errors.mobile) {
    const digits = clean.mobile.replace(/\D/g, '');
    if (!MOBILE_RE.test(clean.mobile) || digits.length < 7 || digits.length > 15) {
      errors.mobile = 'Please enter a valid mobile number';
    }
  }
  const rawMsg = typeof body.message === 'string' ? body.message : '';
  clean.message = rawMsg.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (clean.message.length > QUOTE_MESSAGE_MAX) errors.message = `Must be at most ${QUOTE_MESSAGE_MAX} characters`;
  let product = null;
  if (!errors.productId) {
    product = db.getPublicProduct(clean.productId);
    if (!product) errors.productId = 'Please choose a product from the list';
  }
  return { errors, clean, product };
}

// Tiny in-memory per-IP limiter (free, best-effort; per serverless instance on Vercel).
const quoteHits = new Map();
const QUOTE_WINDOW_MS = 10 * 60 * 1000;
const QUOTE_MAX_PER_WINDOW = 8;
function quoteRateLimited(ip) {
  const now = Date.now();
  const hits = (quoteHits.get(ip) || []).filter((t) => now - t < QUOTE_WINDOW_MS);
  hits.push(now);
  quoteHits.set(ip, hits);
  if (quoteHits.size > 5000) quoteHits.clear();
  return hits.length > QUOTE_MAX_PER_WINDOW;
}

app.post('/api/quotes', async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  // Honeypot: real customers never see or fill the "website" field.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return res.status(201).json({ ok: true, message: 'Thank you! Your quote request has been received.' });
  }
  const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
  if (quoteRateLimited(ip)) {
    return res.status(429).json({ message: 'Too many requests. Please try again in a few minutes.' });
  }
  const { errors, clean, product } = validateQuote(body);
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
  }
  try {
    const quote = await quotes.createQuote({
      firstName: clean.firstName,
      surname: clean.surname,
      mobile: clean.mobile,
      email: clean.email.toLowerCase(),
      productId: product.id,
      productName: product.name,
      message: clean.message,
    });
    res.status(201).json({
      ok: true,
      id: quote.id,
      message: 'Thank you! Your quote request has been received. Our team will contact you shortly.',
    });
  } catch (err) {
    console.error('[quotes] create failed:', err.message);
    res.status(500).json({ message: 'Could not save your request. Please try again.' });
  }
});

// ---- Quote-request notifications (dashboard, JWT required) ----
// A request is "new" until the owner opens the Notifications page; viewing marks it seen
// (seen_at), after which it only appears under "Earlier / Seen" and no longer counts.
const quoteRoute = (fn) => async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try { await fn(req, res); } catch (err) {
    console.error('[quotes]', err.message);
    res.status(err.status || 500).json({ message: err.status ? err.message : 'Quote storage is unavailable right now' });
  }
};

app.get('/api/quotes', auth, quoteRoute(async (req, res) => {
  const data = await quotes.listQuotes(300);
  res.json({ ...data, unreadCount: data.newCount, backend: quotes.backend() });
}));

app.get('/api/quotes/summary', auth, quoteRoute(async (req, res) => {
  const s = await quotes.quoteSummary();
  res.json({ ...s, unreadCount: s.newCount, backend: quotes.backend() });
}));

function parseIds(raw) {
  if (!Array.isArray(raw)) return null;
  const ids = [...new Set(raw.map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 500);
  return ids;
}

app.post('/api/quotes/seen', auth, quoteRoute(async (req, res) => {
  const ids = parseIds((req.body || {}).ids);
  if (ids && !ids.length) return res.json({ ok: true, updated: 0, ...(await quotes.quoteSummary()) });
  const updated = await quotes.markQuotesSeen(ids);
  const s = await quotes.quoteSummary();
  res.json({ ok: true, updated, ...s, unreadCount: s.newCount });
}));

// Back-compat aliases for the old bell dropdown.
app.post('/api/quotes/read-all', auth, quoteRoute(async (req, res) => {
  const updated = await quotes.markQuotesSeen(null);
  res.json({ ok: true, updated, unreadCount: 0, newCount: 0 });
}));
app.patch('/api/quotes/:id/read', auth, quoteRoute(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Invalid id' });
  await quotes.markQuotesSeen([id]);
  const s = await quotes.quoteSummary();
  res.json({ ok: true, unreadCount: s.newCount, newCount: s.newCount });
}));

// Delete one request (used to clean up clearly-labelled TEST submissions).
app.delete('/api/quotes/:id', auth, quoteRoute(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Invalid id' });
  const removed = await quotes.deleteQuote(id);
  if (!removed) return res.status(404).json({ message: 'Quote request not found' });
  res.json({ ok: true, removed });
}));

// Serve uploaded batch images
app.get('/api/uploads/batches/:file', (req, res) => {
  const abs = db.resolveUploadPath(req.params.file);
  if (!abs) return res.status(404).end();
  res.sendFile(abs);
});

// Static front end:
//   /            -> public customer website (client/dist/index.html)
//   /product/:id -> public website (client-side route)
//   /admin/*     -> owners' dashboard (client/dist/admin/index.html)
const DIST = path.join(ROOT, 'client', 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'Not found' });
    if (req.path === '/admin' || req.path.startsWith('/admin/')) {
      return res.sendFile(path.join(DIST, 'admin', 'index.html'));
    }
    res.sendFile(path.join(DIST, 'index.html'));
  });
} else {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).end();
    res.status(404).json({
      message: 'Frontend is running in Vite development mode on port 5173.',
    });
  });
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Threadline API listening on http://127.0.0.1:${PORT}`);
    console.log(`SQLite database: ${db.DB_PATH}`);
  });
}

module.exports = app;
