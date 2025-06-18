import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Contexto de autenticación
import { LogIn } from 'lucide-react'; // Ícono
import toast from 'react-hot-toast'; // Notificaciones

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
      toast.success('Inicio de sesión exitoso');
      navigate('/');
    } catch (error) {
      toast.error('Credenciales inválidas. Por favor, intente de nuevo.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 md:p-10 space-y-6">
        {/* Header */}
        <div className="text-center">
          <img 
            src="/logo-odec.jpeg" 
            alt="ODEC Logo" 
            className="h-20 w-auto object-contain mx-auto mb-5"
          />
          <h2 className="font-display text-3xl font-bold text-odec-blue">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Bienvenido al Sistema de Gestión de Formularios
          </p>
        </div>
        
        {/* Login Form */}
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete='username'
                required
                className="appearance-none block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-odec-blue focus:border-odec-blue sm:text-sm transition"
                placeholder="su-usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete='current-password'
                required
                className="appearance-none block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-odec-blue focus:border-odec-blue sm:text-sm transition"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-odec-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  <span>Iniciando sesión...</span>
                </div>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Ingresar
                </>
              )}
            </button>
          </div>

          {/* Link to Register */}
          <div className="text-center pt-2">
            <Link to="/register" className="font-medium text-sm text-odec-blue hover:text-blue-700 transition-colors">
              ¿No tienes una cuenta? Regístrate
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;