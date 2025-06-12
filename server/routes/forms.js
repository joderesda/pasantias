import express from 'express';
import pool from '../config/db.js'; // Pool de conexiones a PostgreSQL
import { authenticateToken } from '../middleware/auth.js'; // Middleware de autenticación

const router = express.Router();

// ==============================================
// GET / - Obtener todos los formularios (ordenados por fecha)
// ==============================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('Obteniendo todos los formularios para el usuario:', req.user.id);
    
    // Consulta a la DB con manejo de roles
    let query = 'SELECT * FROM forms';
    let params = [];
    
    // Si no es admin, solo muestra los formularios que ha creado
    if (req.user.role !== 'admin') {
      query += ' WHERE created_by = $1';
      params = [req.user.id];
    }
    
    query += ' ORDER BY updated_at DESC';
    
    const { rows: forms } = await pool.query(query, params);
    
    console.log(`Encontrados ${forms.length} formularios`);
    res.json(forms);
  } catch (error) {
    console.error('Error al obtener formularios:', error);
    res.status(500).json({ 
      message: 'Error del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==============================================
// GET /:id - Obtener un formulario por ID
// ==============================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log(`Obteniendo formulario con ID: ${req.params.id}`);
    
    let query = 'SELECT * FROM forms WHERE id = $1';
    let params = [req.params.id];
    
    // Si no es admin, verifica que sea el creador
    if (req.user.role !== 'admin') {
      query += ' AND created_by = $2';
      params.push(req.user.id);
    }
    
    const { rows: forms } = await pool.query(query, params);
    
    if (forms.length === 0) {
      console.log('Formulario no encontrado o no autorizado');
      return res.status(404).json({ message: 'Formulario no encontrado' });
    }
    
    console.log('Formulario encontrado:', forms[0].id);
    res.json(forms[0]);
  } catch (error) {
    console.error(`Error al obtener formulario ${req.params.id}:`, error);
    res.status(500).json({ 
      message: 'Error del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==============================================
// POST / - Crear formulario (solo admin)
// ==============================================
router.post('/', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    console.log('Usuario no autorizado intentando crear formulario:', req.user.id);
    return res.status(403).json({ message: 'No autorizado' });
  }
  
  try {
    const { name, description, questions } = req.body;
    
    // Validación básica
    if (!name || !questions) {
      console.log('Datos incompletos al crear formulario:', { name, questions });
      return res.status(400).json({ message: 'Nombre y preguntas son requeridos' });
    }
    
    console.log('Creando nuevo formulario:', name);
    
    // Inserta el formulario en la DB
    const { rows: [newForm] } = await pool.query(
      `INSERT INTO forms 
       (name, description, questions, created_by, created_at, updated_at, version) 
       VALUES ($1, $2, $3, $4, NOW(), NOW(), 1)
       RETURNING *`, // Devuelve todo el objeto creado
      [
        name, 
        description || '', 
        JSON.stringify(questions),
        req.user.id
      ]
    );
    
    console.log('Formulario creado con ID:', newForm.id);
    res.status(201).json(newForm);
  } catch (error) {
    console.error('Error al crear formulario:', error);
    res.status(500).json({ 
      message: 'Error al crear formulario',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==============================================
// PUT /:id - Actualizar formulario (solo admin)
// ==============================================
router.put('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    console.log('Usuario no autorizado intentando actualizar formulario:', req.user.id);
    return res.status(403).json({ message: 'No autorizado' });
  }
  
  try {
    const { name, description, questions } = req.body;
    
    // Validación básica
    if (!name || !questions) {
      console.log('Datos incompletos al actualizar formulario:', { name, questions });
      return res.status(400).json({ message: 'Nombre y preguntas son requeridos' });
    }
    
    console.log(`Actualizando formulario ID: ${req.params.id}`);
    
    // Actualiza el formulario
    const { rows: [updatedForm] } = await pool.query(
      `UPDATE forms 
       SET name = $1, description = $2, questions = $3, 
           updated_at = NOW(), version = version + 1 
       WHERE id = $4
       RETURNING *`, // Devuelve el objeto actualizado
      [
        name, 
        description || '', 
        JSON.stringify(questions), 
        req.params.id
      ]
    );
    
    if (!updatedForm) {
      console.log('Formulario no encontrado para actualizar:', req.params.id);
      return res.status(404).json({ message: 'Formulario no encontrado' });
    }
    
    console.log('Formulario actualizado:', updatedForm.id);
    res.json(updatedForm);
  } catch (error) {
    console.error(`Error al actualizar formulario ${req.params.id}:`, error);
    res.status(500).json({ 
      message: 'Error al actualizar formulario',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==============================================
// DELETE /:id - Eliminar formulario (solo admin)
// ==============================================
router.delete('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    console.log('Usuario no autorizado intentando eliminar formulario:', req.user.id);
    return res.status(403).json({ message: 'No autorizado' });
  }
  
  try {
    console.log(`Eliminando formulario ID: ${req.params.id}`);
    
    // Verificar si existe primero
    const { rows: [existingForm] } = await pool.query(
      'SELECT id FROM forms WHERE id = $1', 
      [req.params.id]
    );
    
    if (!existingForm) {
      console.log('Formulario no encontrado para eliminar:', req.params.id);
      return res.status(404).json({ message: 'Formulario no encontrado' });
    }
    
    // Usar transacción para eliminar formulario y sus respuestas
    await pool.query('BEGIN');
    
    // Eliminar respuestas primero (por la FK)
    await pool.query(
      'DELETE FROM responses WHERE form_id = $1', 
      [req.params.id]
    );
    
    // Luego eliminar el formulario
    await pool.query(
      'DELETE FROM forms WHERE id = $1', 
      [req.params.id]
    );
    
    await pool.query('COMMIT');
    
    console.log('Formulario eliminado exitosamente:', req.params.id);
    res.json({ message: 'Formulario eliminado' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(`Error al eliminar formulario ${req.params.id}:`, error);
    res.status(500).json({ 
      message: 'Error al eliminar formulario',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;