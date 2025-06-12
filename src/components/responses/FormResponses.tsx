import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from '../../contexts/FormContext';
import { Download, ArrowLeft, BarChart, Eye, Edit2, Trash2, Save, X } from 'lucide-react';
import Spinner from '../ui/Spinner';
import { exportToExcel } from '../../utils/excelUtils';
import { formatDateDisplay } from '../../utils/dateUtils';
import ConfirmDialog from '../ui/ConfirmDialog';
import { FormResponse, QuestionResponse } from '../../types';

const FormResponses: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { loadForm, loadResponses, currentForm, responses, isLoading, deleteResponse, saveResponse } = useForm();
  const [isExporting, setIsExporting] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<string | null>(null);
  const [editingResponse, setEditingResponse] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  
  useEffect(() => {
    if (id) {
      loadForm(id);
      loadResponses(id);
    }
  }, [id]);

  const calculateCompletionPercentage = (response: FormResponse) => {
    if (!currentForm) return 0;
    
    const mainQuestions = currentForm.questions.filter(q => !q.parentId);
    const totalQuestions = mainQuestions.length;
    
    if (totalQuestions === 0) return 100;
    
    const answeredQuestions = mainQuestions.filter(question => {
      const answer = response.responses.find(r => r.questionId === question.id);
      return answer && answer.value !== null && answer.value !== '' && 
        (!Array.isArray(answer.value) || answer.value.length > 0);
    }).length;
    
    return Math.round((answeredQuestions / totalQuestions) * 100);
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-100 text-green-800';
    if (percentage >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };
  
  const handleExportResponses = async () => {
    if (!currentForm || !id) return;
    
    try {
      setIsExporting(true);
      const formResponses = responses[id] || [];
      await exportToExcel(
        formResponses, 
        `respuestas_${currentForm.name.replace(/\s+/g, '_').toLowerCase()}.xlsx`,
        currentForm
      );
    } catch (error) {
      console.error('Error exporting responses:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteResponse = async () => {
    if (!id || !responseToDelete) return;

    try {
      await deleteResponse(id, responseToDelete);
      setResponseToDelete(null);
      await loadResponses(id);
    } catch (error) {
      console.error('Error deleting response:', error);
    }
  };

  const startEditing = (responseId: string) => {
    const response = responses[id!].find(r => r.id === responseId);
    if (response) {
      const initialValues: Record<string, any> = {};
      response.responses.forEach(r => {
        initialValues[r.questionId] = r.value;
      });
      setEditedValues(initialValues);
      setEditingResponse(responseId);
    }
  };

  const cancelEditing = () => {
    setEditingResponse(null);
    setEditedValues({});
  };

  const handleSaveEdit = async () => {
    if (!id || !editingResponse || !currentForm) return;

    const originalResponse = responses[id].find(r => r.id === editingResponse);
    if (!originalResponse) return;

    const updatedResponses: QuestionResponse[] = currentForm.questions
      .filter(q => !q.parentId)
      .map(question => ({
        questionId: question.id,
        value: editedValues[question.id] ?? null
      }));

    const updatedResponse: Omit<FormResponse, 'id' | 'createdAt'> = {
      formId: id,
      formVersion: currentForm.version,
      responses: updatedResponses,
      updatedOffline: false,
      userId: originalResponse.userId,
      username: originalResponse.username
    };

    try {
      await saveResponse(updatedResponse);
      await loadResponses(id);
      setEditingResponse(null);
      setEditedValues({});
    } catch (error) {
      console.error('Error saving response:', error);
    }
  };
  
  const getFormattedResponseValue = (questionId: string, responseIndex: number) => {
    if (!currentForm || !id) return '';
    
    const formResponses = responses[id] || [];
    if (!formResponses[responseIndex]) return '';
    
    const response = formResponses[responseIndex].responses.find(r => r.questionId === questionId);
    if (!response) return '';
    
    const question = currentForm.questions?.find(q => q.id === questionId);
    if (!question) return '';
    
    switch (question.type) {
      case 'select':
        const option = question.options?.find(o => o.id === response.value);
        return option ? option.text : '';
        
      case 'multiselect':
        if (!Array.isArray(response.value)) return '';
        return question.options
          ?.filter(o => response.value.includes(o.id))
          .map(o => o.text)
          .join(', ');
        
      case 'boolean':
        return response.value === true ? 'Sí' : response.value === false ? 'No' : '';
        
      default:
        return response.value;
    }
  };

  const renderEditableCell = (question: any, responseId: string) => {
    if (!currentForm) return null;

    const value = editedValues[question.id];

    switch (question.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => setEditedValues({ ...editedValues, [question.id]: e.target.value })}
            className="w-full px-2 py-1 border rounded"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => setEditedValues({ ...editedValues, [question.id]: e.target.value })}
            className="w-full px-2 py-1 border rounded"
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => setEditedValues({ ...editedValues, [question.id]: e.target.value })}
            className="w-full px-2 py-1 border rounded"
          >
            <option value="">Seleccionar...</option>
            {question.options?.map((option: any) => (
              <option key={option.id} value={option.id}>
                {option.text}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="space-y-1">
            {question.options?.map((option: any) => (
              <label key={option.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(value || []).includes(option.id)}
                  onChange={(e) => {
                    const currentValues = value || [];
                    const newValues = e.target.checked
                      ? [...currentValues, option.id]
                      : currentValues.filter((id: string) => id !== option.id);
                    setEditedValues({ ...editedValues, [question.id]: newValues });
                  }}
                  className="mr-2"
                />
                <span className="text-sm">{option.text}</span>
              </label>
            ))}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => setEditedValues({ ...editedValues, [question.id]: e.target.value })}
            className="w-full px-2 py-1 border rounded"
          />
        );

      case 'boolean':
        return (
          <div className="space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                checked={value === true}
                onChange={() => setEditedValues({ ...editedValues, [question.id]: true })}
                className="mr-2"
              />
              <span className="text-sm">Sí</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                checked={value === false}
                onChange={() => setEditedValues({ ...editedValues, [question.id]: false })}
                className="mr-2"
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        );

      default:
        return null;
    }
  };
  
  if (isLoading || !currentForm) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }
  
  const formResponses = responses[id || ''] || [];
  const visibleQuestions = currentForm?.questions?.filter(q => !q.parentId) || [];
  
  return (
    <div className="container mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
              <ArrowLeft size={16} className="mr-1" /> Volver
            </button>
            <h1 className="text-2xl font-bold text-gray-800">
              Respuestas: {currentForm.name}
            </h1>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 mt-4 md:mt-0">
            <button
              type="button"
              onClick={handleExportResponses}
              disabled={isExporting || formResponses.length === 0}
              className={`px-4 py-2 rounded-md flex items-center ${
                formResponses.length === 0
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                  : 'bg-green-600 text-white hover:bg-green-700 transition-colors'
              }`}
            >
              {isExporting ? (
                <Spinner size="sm\" color="white" />
              ) : (
                <>
                  <Download size={16} className="mr-2" /> Exportar Respuestas
                </>
              )}
            </button>
            
            <Link
              to={`/vista-previa/${id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Eye size={16} className="mr-2" /> Completar Nueva Respuesta
            </Link>
          </div>
        </div>
        
        {formResponses.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="flex justify-center mb-4">
              <BarChart size={48} className="text-gray-400" />
            </div>
            <p className="text-gray-500">{t('no_responses')}</p>
            <p className="text-sm text-gray-400 mt-2">
              Complete el formulario o importe respuestas para verlas aquí
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-100">
                    Fecha / Usuario
                  </th>
                  
                  {visibleQuestions.map((question) => (
                    <th 
                      key={question.id} 
                      className="py-3 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {question.text}
                    </th>
                  ))}
                  <th className="py-3 px-4 border-b text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-gray-200">
                {formResponses.map((response, index) => {
                  const completionPercentage = calculateCompletionPercentage(response);
                  const completionColorClass = getCompletionColor(completionPercentage);
                  
                  return (
                    <tr key={response.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm border-b sticky left-0 bg-white">
                        <div className="flex flex-col">
                          <span>{formatDateDisplay(response.createdAt)}</span>
                          <span className="text-sm text-gray-600 mt-1">
                            {response.username || 'Usuario Anónimo'}
                          </span>
                          <span className={`text-xs mt-1 px-2 py-1 rounded-full ${completionColorClass}`}>
                            {completionPercentage}%
                          </span>
                          {response.updatedOffline && (
                            <span className="text-xs mt-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                              Offline
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {visibleQuestions.map((question) => (
                        <td key={question.id} className="py-3 px-4 text-sm text-gray-800 border-b">
                          {editingResponse === response.id ? (
                            renderEditableCell(question, response.id)
                          ) : (
                            getFormattedResponseValue(question.id, index)
                          )}
                        </td>
                      ))}
                      
                      <td className="py-3 px-4 text-sm border-b">
                        <div className="flex justify-center space-x-2">
                          {editingResponse === response.id ? (
                            <>
                              <button
                                onClick={handleSaveEdit}
                                className="text-green-600 hover:text-green-800 transition-colors"
                                title="Guardar cambios"
                              >
                                <Save size={16} />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="text-gray-600 hover:text-gray-800 transition-colors"
                                title="Cancelar edición"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <Link
                                to={`/vista-previa/${id}/${response.id}`}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="Editar en formulario"
                              >
                                <Eye size={16} />
                              </Link>
                              <button
                                onClick={() => startEditing(response.id)}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="Editar en tabla"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => setResponseToDelete(response.id)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Eliminar respuesta"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!responseToDelete}
        title="Confirmar eliminación"
        message="¿Está seguro que desea eliminar esta respuesta? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleDeleteResponse}
        onCancel={() => setResponseToDelete(null)}
      />
    </div>
  );
};

export default FormResponses;