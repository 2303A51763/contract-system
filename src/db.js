const { Pool } = require('pg');
module.exports = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgres://app:app@localhost:5432/contracts',
});