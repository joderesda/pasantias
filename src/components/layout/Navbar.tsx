import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, Plus, Upload, Database, LogOut } from 'lucide-react';
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
          <div className="py-3 flex items-center">
            <FileText className="mr-2" size={24} />
            <span className="text-xl font-bold">{t('app_title')}</span>
          </div>
          
          <div className="flex flex-wrap items-center py-3 md:py-0">
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

            <div className="flex items-center ml-4 space-x-4">
              <span className="text-sm font-medium">
                {user?.username}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center text-white hover:text-gray-200"
              >
                <LogOut size={16} className="mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;