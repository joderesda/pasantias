// Importa la librería jsonwebtoken para trabajar con JWT
import jwt from 'jsonwebtoken';

/**
 * Middleware de autenticación JWT.
 * Verifica si un token JWT es válido y adjunta el usuario decodificado a la solicitud (req.user).
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @param {Function} next - Función para pasar al siguiente middleware/ruta.
 */
export const authenticateToken = (req, res, next) => {
  // 1. Obtiene el encabezado 'Authorization' de la solicitud
  const authHeader = req.headers['authorization'];
  
  // 2. Extrae el token del encabezado (formato: "Bearer <token>")
  const token = authHeader && authHeader.split(' ')[1]; // ["Bearer", "<token>"]
  
  // 3. Si no hay token, devuelve un error 401 (No autorizado)
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  try {
    // 4. Verifica el token usando la clave secreta (JWT_SECRET)
    const user = jwt.verify(token, process.env.JWT_SECRET);
    
    // 5. Si es válido, adjunta el usuario decodificado a la solicitud (req.user)
    req.user = user;
    
    // 6. Pasa al siguiente middleware/ruta
    next();
  } catch (error) {
    // 7. Si el token es inválido o expiró, devuelve un error 403 (Prohibido)
    return res.status(403).json({ message: 'Invalid token' });
  }
};