const client = require('prom-client');
client.collectDefaultMetrics();
const contractsCreated = new client.Counter({
  name: 'contracts_created_total', help: 'Contracts created' });
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds', help: 'Request latency',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2] });
module.exports = { client, contractsCreated, httpDuration };