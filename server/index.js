// Importaciones de librerías y módulos
import express from 'express';       // Framework para el servidor web
import cors from 'cors';             // Middleware para habilitar CORS
import dotenv from 'dotenv';         // Para cargar variables de entorno
import helmet from 'helmet';         // Middleware de seguridad para Express
import authRoutes from './routes/auth.js';       // Rutas de autenticación
import formRoutes from './routes/forms.js';      // Rutas de formularios
import responseRoutes from './routes/responses.js'; // Rutas de respuestas

// Configuración de variables de entorno desde el archivo .env
dotenv.config();

// Inicialización de la aplicación Express
const app = express();

// Define el puerto (usando process.env.PORT o 3000 por defecto)
const port = process.env.PORT || 3000;

// ======================
// MIDDLEWARES GLOBALES
// ======================

// Configuración mejorada de CORS (Cross-Origin Resource Sharing)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4173', // Origen permitido
  credentials: true, // Permite enviar credenciales (cookies, tokens)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] // Métodos HTTP permitidos
}));

// Middleware de seguridad (protege cabeceras HTTP)
app.use(helmet());

// Permite parsear el cuerpo de las solicitudes en formato JSON
app.use(express.json());

// Configura headers personalizados para autenticación
app.use((req, res, next) => {
  // Headers permitidos en las solicitudes
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  // Headers expuestos al frontend
  res.header('Access-Control-Expose-Headers', 'Authorization');
  next();
});

// ======================
// RUTAS PRINCIPALES
// ======================

// Rutas de autenticación (ej: /api/auth/login)
app.use('/api/auth', authRoutes);

// Rutas de formularios (ej: /api/forms/create)
app.use('/api/forms', formRoutes);

// Rutas de respuestas (ej: /api/responses/submit)
app.use('/api/responses', responseRoutes);

// ======================
// MANEJO DE ERRORES
// ======================

// Middleware para manejar errores no capturados
app.use((err, req, res, next) => {
  console.error(err.stack); // Log del error en consola
  
  // Respuesta al cliente con formato JSON
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ======================
// INICIAR SERVIDOR
// ======================

// Inicia el servidor en el puerto especificado
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS allowed origin: ${process.env.FRONTEND_URL || 'http://localhost:4173'}`);
});