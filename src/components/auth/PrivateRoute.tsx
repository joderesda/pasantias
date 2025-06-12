import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Contexto de autenticación
import { UserRole } from '../../types'; // Tipos de roles de usuario

// Definición de props del componente
interface PrivateRouteProps {
  children: React.ReactNode; // Componentes hijos a renderizar
  requiredRole?: UserRole; // Rol requerido para acceder (opcional)
}

/**
 * Componente PrivateRoute - Protege rutas basado en autenticación y roles
 * 
 * Funcionalidades:
 * 1. Verifica si el usuario está autenticado
 * 2. Comprueba si el usuario tiene el rol necesario (si se especifica)
 * 3. Redirige a login o a home según corresponda
 */
const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requiredRole }) => {
  // Obtiene estado de autenticación y datos del usuario del contexto
  const { isAuthenticated, user } = useAuth();
  const location = useLocation(); // Hook para obtener la ubicación actual

  // 1. Redirige a login si no está autenticado
  if (!isAuthenticated) {
    // Guarda la ubicación actual para redirigir después del login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Redirige a home si no tiene el rol requerido
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  // 3. Renderiza los hijos si pasa las validaciones
  return <>{children}</>;
};

export default PrivateRoute;