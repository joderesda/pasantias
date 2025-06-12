// Importa el paquete 'pg' (PostgreSQL client for Node.js)
import pkg from 'pg';
// Importa dotenv para cargar variables de entorno desde un archivo .env
import dotenv from 'dotenv';

// Carga las variables de entorno definidas en el archivo .env
dotenv.config();

// Extrae la clase Pool del paquete pg
const { Pool } = pkg;

/**
 * Configuración y creación del pool de conexiones a PostgreSQL.
 * Un pool permite manejar múltiples conexiones eficientemente.
 */
const pool = new Pool({
  // Host de la base de datos (por defecto: 'localhost')
  host: process.env.DB_HOST || 'localhost',
  // Usuario de la base de datos (por defecto: 'postgres')
  user: process.env.DB_USER || 'postgres',
  // Contraseña de la base de datos (¡NUNCA hardcodear en producción!)
  password: process.env.DB_PASSWORD || '3123',
  // Nombre de la base de datos a la que nos conectamos
  database: process.env.DB_NAME || 'form_builder',
  // Puerto de PostgreSQL (por defecto: 5432)
  port: process.env.DB_PORT || 5432,
});

export default pool;