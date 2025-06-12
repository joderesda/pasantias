import express from 'express';
import bcrypt from 'bcryptjs'; // Para hashing de contraseñas
import jwt from 'jsonwebtoken'; // Para generar tokens JWT
import pool from '../config/db.js'; // Pool de conexiones a PostgreSQL

const router = express.Router();

// ==============================================
// Ruta: POST /register
// Descripción: Registra un nuevo usuario
// ==============================================
router.post('/register', async (req, res) => {
  try {
    const { username, password, role = 'user' } = req.body; // Role por defecto: 'user'
    
    // 1. Verifica si el usuario ya existe
    const { rows: users } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (users.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // 2. Hashea la contraseña (con salt)
    const salt = await bcrypt.genSalt(10); // Genera un salt de 10 rondas
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 3. Inserta el usuario en la base de datos
    const { rows: [newUser] } = await pool.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id',
      [username, hashedPassword, role]
    );
    
    // 4. Genera un token JWT con los datos del usuario
    const token = jwt.sign(
      { id: newUser.id, username, role }, // Payload (datos del usuario)
      process.env.JWT_SECRET, // Clave secreta desde .env
      { expiresIn: '24h' } // Token expira en 24 horas
    );
    
    // 5. Devuelve el token al cliente
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==============================================
// Ruta: POST /login
// Descripción: Autentica un usuario existente
// ==============================================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 1. Busca al usuario en la base de datos
    const { rows: users } = await pool.query(
      'SELECT * FROM users WHERE username = $1', 
      [username]
    );
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' }); // Usuario no existe
    }
    
    const user = users[0];
    
    // 2. Compara la contraseña hasheada
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid credentials' }); // Contraseña incorrecta
    }
    
    // 3. Genera un token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role }, // Payload
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // 4. Devuelve el token
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;