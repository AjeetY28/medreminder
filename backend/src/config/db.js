const { Pool } = require('pg');
const dns = require('dns');
const logger = require('./logger');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  logger.error('DATABASE_URL is missing from environment variables!');
}

const isProduction = process.env.NODE_ENV?.toLowerCase() === 'production';

const pool = new Pool({
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Force IPv4 to avoid ENETUNREACH on hosts that resolve to IPv6
  lookup: (hostname, options, callback) => {
    dns.lookup(hostname, { ...options, family: 4 }, callback);
  },
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
