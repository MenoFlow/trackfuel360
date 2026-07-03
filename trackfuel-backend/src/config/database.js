/**
 * Configuration de la connexion MySQL
 */

// APRÈS (ES module — COPIE-COLLE ÇA)
import mysql from 'mysql2/promise';
import 'dotenv/config';

// Configuration du pool de connexions
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'hermenio_user',
  password: process.env.DB_PASSWORD || 'hermenio_pass',
  database: process.env.DB_NAME || 'hermenio_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test de connexion au démarrage
pool.getConnection()
  .then(connection => {
    console.log('✅ Connexion MySQL établie avec succès');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Erreur de connexion MySQL:', err.message);
  });

export default pool;
