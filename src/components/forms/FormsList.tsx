import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Eye, Trash2, BarChart, FileText, Share2 } from 'lucide-react'; // Íconos
import { useForm } from '../../contexts/FormContext'; // Contexto de formularios
import { useAuth } from '../../contexts/AuthContext'; // Contexto de autenticación
import { useTranslation } from 'react-i18next'; // Internacionalización

import ConfirmDialog from '../ui/ConfirmDialog'; // Diálogo de confirmación
import Spinner from '../ui/Spinner'; // Componente de carga
import WeeklyReport from './WeeklyReport'; // Componente de reporte semanal
import ShareFormModal from './ShareFormModal'; // Componente para compartir formulario

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
  const [sharingForm, setSharingForm] = useState<{id: string, name: string} | null>(null); // Formulario a compartir
  const [searchTerm, setSearchTerm] = useState(''); // Término de búsqueda
  const [responsesLoaded, setResponsesLoaded] = useState<Set<string>>(new Set()); // Track which forms have responses loaded

  // ======================
  // EFECTOS SECUNDARIOS
  // ======================

  // Carga los formularios al montar el componente
  useEffect(() => {
    loadForms();
  }, [loadForms]); // Solo se ejecuta una vez al montar

  // Función memoizada para cargar respuestas
  const loadResponsesForForm = useCallback(async (formId: string) => {
    if (!responsesLoaded.has(formId)) {
      try {
        await loadResponses(formId);
        setResponsesLoaded(prev => new Set(prev).add(formId));
      } catch (error) {
        console.error(`Error loading responses for form ${formId}:`, error);
      }
    }
  }, [loadResponses, responsesLoaded]);

  // Carga las respuestas para cada formulario (solo una vez por formulario)
  useEffect(() => {
    forms.forEach(form => {
      if (!responsesLoaded.has(form.id)) {
        loadResponsesForForm(form.id);
      }
    });
  }, [forms, loadResponsesForForm]);

  // ======================
  // FUNCIONES UTILITARIAS
  // ======================

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
  const sortedForms = [...filteredForms].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  // ======================
  // RENDERIZADO
  // ======================

  return (
    <div className="container mx-auto">
      <WeeklyReport />
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header and Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <h1 className="text-3xl font-bold text-odec-blue font-display mb-4 md:mb-0">
              {t('forms_list')}
            </h1>
            <div className="w-full md:w-auto">
              <input
                type="text"
                placeholder={t('search_forms')}
                className="w-full md:w-72 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-odec-blue/50 focus:border-odec-blue transition-shadow"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 flex justify-center items-center">
            <Spinner />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && sortedForms.length === 0 && (
          <div className="text-center py-16 px-6">
            <FileText size={48} className="mx-auto text-gray-300" />
            <h2 className="mt-4 text-xl font-semibold text-gray-700">{t('no_forms_found')}</h2>
            <p className="mt-2 text-gray-500">{t('no_forms_yet_message')}</p>
            {user?.role === 'admin' && (
              <Link
                to="/crear"
                className="mt-6 inline-block bg-odec-blue text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('create_first_form')}
              </Link>
            )}
          </div>
        )}

        {/* Forms Table */}
        {!isLoading && sortedForms.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-6 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="py-3 px-6 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">{t('last_updated')}</th>
                  <th className="py-3 px-6 text-center text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Respuestas</th>
                  <th className="py-3 px-6 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedForms.map((form) => (
                  <tr key={form.id} className="hover:bg-gray-50 transition-colors">
                    {/* Form Name and Description */}
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{form.name}</div>
                      <div className="text-sm text-gray-500 line-clamp-1 hidden md:block">{form.description}</div>
                    </td>
                    {/* Last Updated */}
                    <td className="py-4 px-6 whitespace-nowrap hidden md:table-cell">
                      <div className="text-sm text-gray-600">
                        {new Date(form.updatedAt).toLocaleDateString()}
                      </div>
                    </td>
                    {/* Response Count */}
                    <td className="py-4 px-6 whitespace-nowrap text-center hidden md:table-cell">
                      <span className="px-3 py-1 bg-odec-blue/10 text-odec-blue rounded-full text-xs font-bold">
                        {getResponseCount(form.id)}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="py-4 px-6 whitespace-nowrap text-center">
                      <div className="flex justify-center items-center space-x-4">
                        {(user?.role === 'admin' || user?.role === 'analista' || user?.role === 'invitado') && (
                          <Link to={`/respuestas/${form.id}`} className="text-gray-400 hover:text-odec-blue transition-colors" title={t('view_responses')}>
                            <BarChart size={20} />
                          </Link>
                        )}
                        {user?.role !== 'invitado' && (
                          <Link to={`/vista-previa/${form.id}`} className="text-gray-400 hover:text-odec-blue transition-colors" title={t('preview')}>
                            <Eye size={20} />
                          </Link>
                        )}
                        {user?.role === 'admin' && (
                          <>
                            <Link to={`/editar/${form.id}`} className="text-gray-400 hover:text-odec-blue transition-colors" title={t('edit')}>
                              <Edit size={20} />
                            </Link>
                            <button onClick={() => setFormToDelete(form.id)} className="text-gray-400 hover:text-red-600 transition-colors" title={t('delete')}>
                              <Trash2 size={20} />
                            </button>
                            <button 
                              onClick={() => setSharingForm({ id: form.id, name: form.name })} 
                              className="text-gray-400 hover:text-green-600 transition-colors" 
                              title={t('share')}
                            >
                              <Share2 size={20} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Share Form Modal */}
      {sharingForm && (
        <ShareFormModal 
          isOpen={!!sharingForm}
          onClose={() => setSharingForm(null)}
          formId={sharingForm.id}
          formName={sharingForm.name}
        />
      )}

      {/* Confirmation Dialog */}
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