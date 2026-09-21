const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

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
  res.json({ ok: true, service: 'threadline-api', db: path.basename(db.DB_PATH) });
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

// Serve uploaded batch images
app.get('/api/uploads/batches/:file', (req, res) => {
  const abs = db.resolveUploadPath(req.params.file);
  if (!abs) return res.status(404).end();
  res.sendFile(abs);
});

const DIST = path.join(ROOT, 'client', 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).end();
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
