import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Eye, Trash2, BarChart, Download } from 'lucide-react'; // Íconos
import { useForm } from '../../contexts/FormContext'; // Contexto de formularios
import { useAuth } from '../../contexts/AuthContext'; // Contexto de autenticación
//import { useDatabase } from './DatabaseContext';
import { useTranslation } from 'react-i18next'; // Internacionalización
import { exportToExcel } from '../../utils/excelUtils'; // Utilidad para exportar
import ConfirmDialog from '../ui/ConfirmDialog'; // Diálogo de confirmación
import Spinner from '../ui/Spinner'; // Componente de carga
console.log("Forms cargando");
const FormsList: React.FC = () => {
  // ======================
  // HOOKS Y ESTADO
  // ======================
  const { 
    forms,           // Lista de formularios
    loadForms,       // Función para cargar formularios
    deleteForm,      // Función para eliminar formularios
    isLoading,       // Estado de carga
    responses,       // Respuestas cargadas
    loadResponses    // Función para cargar respuestas
  } = useForm();

  const { user } = useAuth(); // Datos del usuario autenticado
  const { t } = useTranslation(); // Función de traducción

  // Estados locales
  const [formToDelete, setFormToDelete] = useState<string | null>(null); // ID del formulario a eliminar
  const [searchTerm, setSearchTerm] = useState(''); // Término de búsqueda

  // ======================
  // EFECTOS SECUNDARIOS
  // ======================

  // Carga los formularios al montar el componente
  useEffect(() => {
    loadForms();
    console.log("Forms cargados:", forms);
  }, []);

  // Carga las respuestas para cada formulario
  // En FormsList.tsx, modifica el useEffect para cargar respuestas:
  useEffect(() => {
    const loadAllResponses = async () => {
      for (const form of forms) {
        try {
          await loadResponses(form.id);
        } catch (error) {
          console.error(`Error loading responses for form ${form.id}:`, error);
        }
      }
    };
    
    if (forms.length > 0) {
      loadAllResponses();
    }
  }, [forms]); // Solo se ejecuta cuando forms cambia

  // ======================
  // FUNCIONES UTILITARIAS
  // ======================

  /**
   * Exporta un formulario a Excel
   * @param id - ID del formulario
   * @param name - Nombre del formulario (para el nombre del archivo)
   */
  const handleExportForm = async (id: string, name: string) => {
    const form = forms.find(f => f.id === id);
    if (form) {
      await exportToExcel([form], `formulario_${name.replace(/\s+/g, '_').toLowerCase()}.xlsx`);
    }
  };

  /**
   * Obtiene el número de respuestas para un formulario
   * @param formId - ID del formulario
   * @returns Número de respuestas
   */
  const getResponseCount = (formId: string) => {
    return responses[formId]?.length || 0;
  };

  // ======================
  // FILTRADO Y ORDENACIÓN
  // ======================

  // Filtra formularios por término de búsqueda
  const filteredForms = forms.filter(form => 
    form.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    form.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ordena formularios por fecha de actualización (más reciente primero)
  const sortedForms = [...filteredForms].sort((a, b) => b.updatedAt - a.updatedAt);

  // ======================
  // RENDERIZADO
  // ======================

  return (
    <div className="container mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Encabezado y búsqueda */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">{t('forms')}</h1>
          
          <div className="w-full md:w-auto">
            <input
              type="text"
              placeholder={t('search_forms')}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Contenido principal */}
        {isLoading ? (
          <div className="flex justify-center my-12">
            <Spinner />
          </div>
        ) : sortedForms.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-4">
              {searchTerm ? t('no_matching_forms') : t('no_forms_created')}
            </p>
            {user?.role === 'admin' && (
              <Link 
                to="/crear" 
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <span className="mr-2">+</span> {t('create_form')}
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">{t('name')}</th>
                  <th className="py-3 px-6 text-left hidden md:table-cell">{t('description')}</th>
                  <th className="py-3 px-6 text-center hidden md:table-cell">{t('questions')}</th>
                  <th className="py-3 px-6 text-center hidden md:table-cell">{t('responses')}</th>
                  <th className="py-3 px-6 text-center hidden md:table-cell">{t('version')}</th>
                  <th className="py-3 px-6 text-center">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm">
                {sortedForms.map((form) => (
                  <tr key={form.id} className="border-b border-gray-200 hover:bg-gray-50">
                    {/* Nombre */}
                    <td className="py-3 px-6 text-left">
                      <div className="font-medium">{form.name}</div>
                      <div className="text-xs text-gray-500 md:hidden">
                        {new Date(form.updatedAt).toLocaleDateString()}
                      </div>
                    </td>
                    
                    {/* Descripción (solo en desktop) */}
                    <td className="py-3 px-6 text-left hidden md:table-cell">
                      <div className="line-clamp-2">{form.description}</div>
                    </td>
                    
                    {/* Número de preguntas (solo en desktop) */}
                    <td className="py-3 px-6 text-center hidden md:table-cell">
                      {form.questions?.length ?? 0}
                    </td>
                    
                    {/* Número de respuestas (solo en desktop) */}
                    <td className="py-3 px-6 text-center hidden md:table-cell">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        {getResponseCount(form.id)}
                      </span>
                    </td>
                    
                    {/* Versión (solo en desktop) */}
                    <td className="py-3 px-6 text-center hidden md:table-cell">
                      {form.version}
                    </td>
                    
                    {/* Acciones */}
                    <td className="py-3 px-6 text-center">
                      <div className="flex justify-center space-x-2">
                        {/* Acciones solo para admin */}
                        {user?.role === 'admin' && (
                          <>
                            {/* Editar */}
                            <Link 
                              to={`/editar/${form.id}`} 
                              className="text-blue-600 hover:text-blue-900" 
                              title={t('edit')}
                            >
                              <Edit size={18} />
                            </Link>
                            
                            {/* Eliminar */}
                            <button 
                              onClick={() => setFormToDelete(form.id)} 
                              className="text-red-600 hover:text-red-900"
                              title={t('delete')}
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                        
                        {/* Vista previa */}
                        <Link 
                          to={`/vista-previa/${form.id}`} 
                          className="text-green-600 hover:text-green-900" 
                          title={t('preview')}
                        >
                          <Eye size={18} />
                        </Link>
                        
                        {/* Ver respuestas (solo admin) */}
                        {user?.role === 'admin' && (
                          <Link 
                            to={`/respuestas/${form.id}`} 
                            className="text-purple-600 hover:text-purple-900" 
                            title={t('view_responses')}
                          >
                            <BarChart size={18} />
                          </Link>
                        )}
                        
                        {/* Exportar */}
                        <button 
                          onClick={() => handleExportForm(form.id, form.name)} 
                          className="text-orange-600 hover:text-orange-900"
                          title={t('export_form')}
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Diálogo de confirmación para eliminar */}
      <ConfirmDialog
        isOpen={!!formToDelete}
        title={t('confirm_delete')}
        message={t('delete_form_warning')}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        onConfirm={() => {
          if (formToDelete) {
            deleteForm(formToDelete);
            setFormToDelete(null);
          }
        }}
        onCancel={() => setFormToDelete(null)}
      />
    </div>
  );
};

export default FormsList;