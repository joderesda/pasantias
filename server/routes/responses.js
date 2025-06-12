import express from 'express';
import pool from '../config/db.js'; // Pool de conexiones a PostgreSQL
import { authenticateToken } from '../middleware/auth.js'; // Middleware de autenticación JWT

const router = express.Router();

// ==============================================
// GET /form/:formId - Obtener respuestas de un formulario específico
// ==============================================
router.get('/form/:formId', authenticateToken, async (req, res) => {
  try {
    // Consulta que une las tablas `responses` y `users` para obtener el username
    const { rows: responses } = await pool.query(
      `SELECT r.*, u.username 
       FROM responses r 
       LEFT JOIN users u ON r.user_id = u.id 
       WHERE form_id = $1 
       ORDER BY created_at DESC`, // Ordena por fecha descendente
      [req.params.formId]
    );
    res.json(responses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==============================================
// POST / - Enviar una nueva respuesta
// ==============================================
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { formId, formVersion, responses } = req.body;
    
    // Inserta la respuesta en la DB
    const { rows: [newResponse] } = await pool.query(
      `INSERT INTO responses 
       (form_id, form_version, responses, user_id, created_at, updated_offline) 
       VALUES ($1, $2, $3, $4, NOW(), $5)
       RETURNING id`,
      [
        formId,
        formVersion,
        JSON.stringify(responses), // Almacena las respuestas como JSON
        req.user.id, // ID del usuario autenticado (del token JWT)
        false // updated_offline: false por defecto (no es una sincronización offline)
      ]
    );
    
    res.json({ id: newResponse.id }); // Devuelve el ID de la nueva respuesta
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==============================================
// DELETE /:id - Eliminar una respuesta
// ==============================================
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM responses WHERE id = $1', [req.params.id]);
    res.json({ message: 'Response deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==============================================
// POST /import - Importar múltiples respuestas (útil para sincronización offline)
// ==============================================
router.post('/import', authenticateToken, async (req, res) => {
  try {
    const responses = req.body; // Array de respuestas
    
    // Itera cada respuesta y la inserta en la DB
    for (const response of responses) {
      await pool.query(
        `INSERT INTO responses 
         (form_id, form_version, responses, user_id, created_at, updated_offline) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          response.formId,
          response.formVersion,
          JSON.stringify(response.responses),
          req.user.id,
          response.createdAt, // Usa la fecha original de creación (offline)
          true // Marca como sincronizado desde offline
        ]
      );
    }
    
    res.json({ message: 'Responses imported' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;