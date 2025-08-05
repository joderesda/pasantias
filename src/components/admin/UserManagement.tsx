import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { User, UserRole } from '../../types';
import { ShieldCheck, Users, Loader2, Trash2 } from 'lucide-react';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('No se pudo cargar la lista de usuarios.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    } else {
      setIsLoading(false);
    }
  }, [user, fetchUsers]);

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      try {
        await fetch(`/api/users/${userId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        toast.success('Usuario eliminado con éxito.');
        setUsers(users.filter(u => u.id !== userId));
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('No se pudo eliminar el usuario.');
      }
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });
      toast.success('Rol de usuario actualizado con éxito.');
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('No se pudo actualizar el rol del usuario.');
    }
  };

  if (user?.role !== 'admin') {
    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col items-center justify-center h-full p-10 text-center bg-white rounded-xl shadow-lg">
                <ShieldCheck className="w-16 h-16 mb-4 text-red-500" />
                <h2 className="text-2xl font-bold text-gray-800">Acceso Denegado</h2>
                <p className="text-gray-600">Esta página es solo para administradores.</p>
            </div>
        </div>
    );
  }

  const roleBadgeStyles: { [key in UserRole]: string } = {
    admin: 'bg-odec-blue text-white',
    analista: 'bg-blue-100 text-odec-blue',
    user: 'bg-gray-200 text-gray-800',
    invitado: 'bg-green-100 text-green-800',
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Users className="w-8 h-8 mr-3 text-odec-blue" />
          <h1 className="font-display text-3xl font-bold text-odec-blue">
            Gestión de Usuarios
          </h1>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-10 h-10 text-odec-blue animate-spin" />
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3 px-6 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th scope="col" className="py-3 px-6 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Rol Actual
                  </th>
                  <th scope="col" className="py-3 px-6 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <p className="font-medium text-odec-text">{u.username}</p>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${roleBadgeStyles[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      {u.id === user?.id ? (
                         <span className="text-sm text-gray-500 italic">No se puede cambiar el rol propio</span>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            className="form-select block w-full max-w-xs border-gray-300 rounded-lg shadow-sm focus:border-odec-blue focus:ring focus:ring-odec-blue focus:ring-opacity-50 transition"
                          >
                            <option value="user">Usuario</option>
                            <option value="admin">Administrador</option>
                            <option value="analista">Analista</option>
                            <option value="invitado">Invitado</option>
                          </select>
                          <button 
                            onClick={() => handleDeleteUser(u.id)} 
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
