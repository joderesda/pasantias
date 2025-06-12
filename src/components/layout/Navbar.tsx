import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, Plus, Upload, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-green-700 text-white' : 'text-white hover:bg-green-700';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-green-800 text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between">
          {/* Logo y título */}
          <div className="py-3 flex items-center">
            <img 
              src="/logo-odec.jpeg" 
              alt="ODEC Logo" 
              className="h-10 w-auto object-contain mr-3"
            />
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight">
                {t('app_title')}
              </span>
              <span className="text-xs text-green-200 hidden md:block">
                Sistema de Formularios
              </span>
            </div>
          </div>
          
          {/* Navegación y usuario */}
          <div className="flex flex-wrap items-center py-3 md:py-0">
            {/* Enlaces de navegación */}
            <div className="flex flex-wrap items-center mr-6">
              <Link 
                to="/" 
                className={`${isActive('/')} px-3 py-2 rounded-md text-sm font-medium flex items-center mx-1 my-1 md:my-0`}
              >
                <FileText className="mr-1" size={16} />
                {t('forms')}
              </Link>
              
              {user?.role === 'admin' && (
                <Link 
                  to="/crear" 
                  className={`${isActive('/crear')} px-3 py-2 rounded-md text-sm font-medium flex items-center mx-1 my-1 md:my-0`}
                >
                  <Plus className="mr-1" size={16} />
                  {t('create_form')}
                </Link>
              )}
              
              {user?.role === 'admin' && (
                <Link 
                  to="/importar-exportar" 
                  className={`${isActive('/importar-exportar')} px-3 py-2 rounded-md text-sm font-medium flex items-center mx-1 my-1 md:my-0`}
                >
                  <Upload className="mr-1" size={16} />
                  {t('import_export')}
                </Link>
              )}
            </div>

            {/* Información del usuario y logout */}
            <div className="flex items-center space-x-4 border-l border-green-600 pl-4">
              <div className="text-sm">
                <span className="font-medium">{user?.username}</span>
                <span className="text-green-200 ml-2 text-xs">
                  ({user?.role === 'admin' ? 'Administrador' : 'Usuario'})
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center text-white hover:text-gray-200 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut size={16} className="mr-1" />
                <span className="hidden md:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;