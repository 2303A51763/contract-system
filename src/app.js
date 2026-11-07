require('express-async-errors');
const express = require('express');
const db = require('./db');
const auth = require('./auth');
const wf = require('./workflow');
const m = require('./metrics');

const app = express();
app.use(express.json());

// latency metrics
app.use((req, res, next) => {
  const end = m.httpDuration.startTimer();
  res.on('finish', () => end({
    method: req.method, route: req.route ? req.route.path : req.path,
    status: res.statusCode }));
  next();
});

const audit = (contractId, actor, action, details = {}) =>
  db.query('INSERT INTO audit_log(contract_id,actor_id,action,details) VALUES($1,$2,$3,$4)',
    [contractId, actor, action, details]);

// health + metrics (used by Kubernetes and Prometheus)
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', m.client.register.contentType);
  res.end(await m.client.register.metrics());
});

app.post('/auth/register', auth.register);
app.post('/auth/login', auth.login);

// create contract
app.post('/contracts', auth.authenticate, async (req, res) => {
  const { title, counterparty, value, start_date, end_date } = req.body;
  const r = await db.query(
    `INSERT INTO contracts(title,counterparty,value,start_date,end_date,created_by)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [title, counterparty, value, start_date, end_date, req.user.id]);
  m.contractsCreated.inc();
  await audit(r.rows[0].id, req.user.id, 'CREATED');
  res.status(201).json(r.rows[0]);
});

// list contracts
app.get('/contracts', auth.authenticate, async (req, res) => {
  const r = await db.query('SELECT * FROM contracts ORDER BY id DESC');
  res.json(r.rows);
});

// submit for approval -> creates approval rows
app.post('/contracts/:id/submit', auth.authenticate, async (req, res) => {
  const c = (await db.query('SELECT * FROM contracts WHERE id=$1', [req.params.id])).rows[0];
  if (!c) return res.sendStatus(404);
  if (!wf.canTransition(c.status, 'IN_REVIEW'))
    return res.status(409).json({ error: `Cannot submit from ${c.status}` });
  for (const role of wf.requiredApprovers(c.value))
    await db.query('INSERT INTO approvals(contract_id,approver_role) VALUES($1,$2)', [c.id, role]);
  await db.query("UPDATE contracts SET status='IN_REVIEW' WHERE id=$1", [c.id]);
  await audit(c.id, req.user.id, 'SUBMITTED');
  res.json({ status: 'IN_REVIEW', requiredApprovers: wf.requiredApprovers(c.value) });
});

// approve / reject as a role
app.post('/contracts/:id/decision', auth.authenticate,
  auth.requireRole('LEGAL', 'FINANCE', 'ADMIN'), async (req, res) => {
  const { decision, comment } = req.body; // APPROVED | REJECTED
  const id = req.params.id;
  await db.query(
    `UPDATE approvals SET decision=$1, comment=$2, decided_by=$3, decided_at=now()
     WHERE contract_id=$4 AND approver_role=$5 AND decision='PENDING'`,
    [decision, comment, req.user.id, id, req.user.role]);
  const all = (await db.query('SELECT * FROM approvals WHERE contract_id=$1', [id])).rows;
  const outcome = wf.evaluate(all);
  await db.query('UPDATE contracts SET status=$1 WHERE id=$2', [outcome, id]);
  await audit(id, req.user.id, `DECISION_${decision}`, { comment, outcome });
  res.json({ status: outcome });
});

// audit trail
app.get('/contracts/:id/audit', auth.authenticate, async (req, res) => {
  const r = await db.query('SELECT * FROM audit_log WHERE contract_id=$1 ORDER BY at', [req.params.id]);
  res.json(r.rows);
});

app.use((err, req, res, next) => {
  if (err.code === '23505') return res.status(409).json({ error: 'Already exists' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;