const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

async function register(req, res) {
  const { email, password, role } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const r = await db.query(
    'INSERT INTO users(email,password_hash,role) VALUES($1,$2,$3) RETURNING id,email,role',
    [email, hash, role || 'REQUESTER']);
  res.status(201).json(r.rows[0]);
}

async function login(req, res) {
  const { email, password } = req.body;
  const r = await db.query('SELECT * FROM users WHERE email=$1', [email]);
  const u = r.rows[0];
  if (!u || !(await bcrypt.compare(password, u.password_hash)))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: u.id, role: u.role }, SECRET, { expiresIn: '8h' });
  res.json({ token });
}

function authenticate(req, res, next) {
  const h = req.headers.authorization || '';
  try {
    req.user = jwt.verify(h.replace('Bearer ', ''), SECRET);
    next();
  } catch { res.status(401).json({ error: 'Unauthorized' }); }
}

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Forbidden' });

module.exports = { register, login, authenticate, requireRole };