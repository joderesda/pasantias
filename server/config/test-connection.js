import pool from './db.js';

(async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Conectado a PostgreSQL:', res.rows[0]);
  } catch (err) {
    console.error('❌ Error al conectar:', err);
  } finally {
    await pool.end(); // Cierra la conexión al final
  }
})();