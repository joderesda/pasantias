import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, Plus, LogOut, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const roleDisplayNames: { [key: string]: string } = {
    admin: 'Administrador',
    user: 'Usuario',
    analista: 'Analista',
  };

  const isActive = (path: string) => {
    // Updated styles for the new theme
    return location.pathname === path
      ? 'bg-black/20 text-white' // Active link style
      : 'text-white/70 hover:bg-black/10 hover:text-white'; // Inactive link style
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-odec-blue text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between">
          {/* Logo and title */}
          <div className="py-3 flex items-center">
            <img
              src="/logo-odec.jpeg"
              alt="ODEC Logo"
              className="h-10 w-auto object-contain mr-4"
            />
            <div className="flex flex-col">
              <span className="font-display text-xl font-bold leading-tight">
                {t('app_title')}
              </span>
              <span className="text-xs text-white/70 hidden md:block">
                Sistema de Gestión de Formularios
              </span>
            </div>
          </div>

          {/* Navigation and user info */}
          <div className="flex flex-wrap items-center py-3 md:py-0">
            {/* Navigation links */}
            <div className="flex flex-wrap items-center mr-6">
              <Link
                to="/"
                className={`${isActive('/')} px-3 py-2 rounded-md text-sm font-medium flex items-center mx-1 my-1 md:my-0 transition-colors`}
              >
                <FileText className="mr-2" size={16} />
                {t('forms')}
              </Link>

              {user?.role === 'admin' && (
                <Link
                  to="/crear"
                  className={`${isActive('/crear')} px-3 py-2 rounded-md text-sm font-medium flex items-center mx-1 my-1 md:my-0 transition-colors`}
                >
                  <Plus className="mr-2" size={16} />
                  {t('create_form')}
                </Link>
              )}

              {user?.role === 'admin' && (
                <Link
                  to="/admin/users"
                  className={`${isActive('/admin/users')} px-3 py-2 rounded-md text-sm font-medium flex items-center mx-1 my-1 md:my-0 transition-colors`}
                >
                  <Users className="mr-2" size={16} />
                  {t('user_management')}
                </Link>
              )}
            </div>

            {/* User info and logout */}
            <div className="flex items-center space-x-4 border-l border-white/20 pl-4">
              <div className="text-sm text-right">
                <span className="font-medium block">{user?.username}</span>
                {user?.role && (
                  <span className="text-white/70 text-xs">
                    {roleDisplayNames[user.role as keyof typeof roleDisplayNames]}
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center text-white/70 hover:text-white transition-colors p-2 rounded-md hover:bg-black/10"
                title="Cerrar sesión"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;