const { Pool } = require('pg');
const logger = require('./logger');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  logger.error('DATABASE_URL is missing from environment variables!');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  logger.debug('Database pool client connected successfully');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle database client', err);
});

module.exports = {
  query: (text, params) => {
    logger.debug('Executing DB Query: %s', text);
    return pool.query(text, params);
  },
  getClient: async () => {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;
    
    // Monkey patch query to log queries inside transactions
    client.query = (...args) => {
      logger.debug('Executing DB Transaction Query: %s', args[0]);
      return query.apply(client, args);
    };
    
    client.release = () => {
      client.query = query;
      client.release = release;
      return release.apply(client);
    };
    
    return client;
  },
  pool,
};
