import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from '../../contexts/FormContext';
import { Download, ArrowLeft, BarChart, Eye, Edit2, Trash2, Save, X, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import Spinner from '../ui/Spinner';
import { exportToExcel } from '../../utils/excelUtils';
import { formatDateDisplay } from '../../utils/dateUtils';
import ConfirmDialog from '../ui/ConfirmDialog';
import { FormResponse, QuestionResponse, Question } from '../../types';

interface FilterState {
  dateFrom: string;
  dateTo: string;
  questionFilters: Record<string, string | string[]>;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const FormResponses: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { loadForm, loadResponses, currentForm, responses, isLoading, deleteResponse, saveResponse } = useForm();
  const [isExporting, setIsExporting] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<string | null>(null);
  const [editingResponse, setEditingResponse] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    questionFilters: {},
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  useEffect(() => {
    if (id) {
      loadForm(id);
      loadResponses(id);
    }
  }, [id]);

  // Función recursiva para obtener todas las preguntas visibles incluyendo subpreguntas anidadas
  const getAllVisibleQuestions = (): Question[] => {
    if (!currentForm?.questions) return [];
    
    const allVisibleQuestions: Question[] = [];
    const processedQuestions = new Set<string>();
    
    const processQuestion = (question: Question, responses: FormResponse[], depth: number = 0) => {
      if (processedQuestions.has(question.id) || depth > 10) return;
      
      allVisibleQuestions.push(question);
      processedQuestions.add(question.id);
      
      // Si es una pregunta de selección, incluir subpreguntas que han sido respondidas
      if (question.type === 'select' || question.type === 'multiselect') {
        const subQuestions = currentForm.questions.filter(q => q.parentId === question.id);
        
        subQuestions.forEach(subQuestion => {
          // Verificar si esta subpregunta ha sido respondida en alguna respuesta
          const hasBeenAnswered = responses.some(response => {
            const parentResponse = response.responses.find(r => r.questionId === question.id);
            if (!parentResponse) return false;
            
            let shouldShow = false;
            if (question.type === 'select') {
              shouldShow = subQuestion.parentOptionId === parentResponse.value;
            } else if (question.type === 'multiselect') {
              shouldShow = Array.isArray(parentResponse.value) && 
                          parentResponse.value.includes(subQuestion.parentOptionId);
            }
            
            return shouldShow && response.responses.some(r => r.questionId === subQuestion.id);
          });
          
          if (hasBeenAnswered) {
            processQuestion(subQuestion, responses, depth + 1);
          }
        });
      }
    };
    
    // Procesar todas las preguntas principales
    const formResponses = responses[id || ''] || [];
    currentForm.questions
      .filter(q => !q.parentId)
      .forEach(q => processQuestion(q, formResponses));
    
    return allVisibleQuestions;
  };

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
      const formResponses = getFilteredAndSortedResponses();
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

    const updatedResponses: QuestionResponse[] = getAllVisibleQuestions()
      .map(question => ({
        questionId: question.id,
        value: editedValues[question.id] ?? null
      }))
      .filter(r => r.value !== null && r.value !== '');

    const updatedResponse: Omit<FormResponse, 'id' | 'createdAt'> = {
      formId: id,
      formVersion: currentForm.version,
      responses: updatedResponses,
      updatedOffline: false,
      userId: originalResponse.userId,
      username: originalResponse.username
    };

    try {
      await saveResponse(updatedResponse, editingResponse);
      await loadResponses(id);
      setEditingResponse(null);
      setEditedValues({});
    } catch (error) {
      console.error('Error saving response:', error);
    }
  };

  // Función para filtrar y ordenar respuestas
  const getFilteredAndSortedResponses = () => {
    if (!id) return [];
    
    let filteredResponses = [...(responses[id] || [])];
    
    // Filtro por fecha
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom).getTime();
      filteredResponses = filteredResponses.filter(r => r.createdAt >= fromDate);
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo).getTime() + (24 * 60 * 60 * 1000) - 1; // Fin del día
      filteredResponses = filteredResponses.filter(r => r.createdAt <= toDate);
    }
    
    // Filtros por preguntas
    Object.entries(filters.questionFilters).forEach(([questionId, filterValue]) => {
      if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) return;
      
      filteredResponses = filteredResponses.filter(response => {
        const questionResponse = response.responses.find(r => r.questionId === questionId);
        if (!questionResponse) return false;
        
        if (Array.isArray(filterValue)) {
          // Para filtros múltiples
          return filterValue.some(value => {
            if (Array.isArray(questionResponse.value)) {
              return questionResponse.value.includes(value);
            }
            return questionResponse.value === value;
          });
        } else {
          // Para filtros simples
          if (Array.isArray(questionResponse.value)) {
            return questionResponse.value.includes(filterValue);
          }
          return String(questionResponse.value).toLowerCase().includes(String(filterValue).toLowerCase());
        }
      });
    });
    
    // Ordenamiento
    filteredResponses.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      if (filters.sortBy === 'createdAt') {
        aValue = a.createdAt;
        bValue = b.createdAt;
      } else if (filters.sortBy === 'username') {
        aValue = a.username || '';
        bValue = b.username || '';
      } else {
        // Ordenar por pregunta específica
        const aResponse = a.responses.find(r => r.questionId === filters.sortBy);
        const bResponse = b.responses.find(r => r.questionId === filters.sortBy);
        aValue = aResponse?.value || '';
        bValue = bResponse?.value || '';
      }
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return filteredResponses;
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleQuestionFilterChange = (questionId: string, value: string | string[]) => {
    setFilters(prev => ({
      ...prev,
      questionFilters: {
        ...prev.questionFilters,
        [questionId]: value
      }
    }));
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      questionFilters: {},
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  };
  
  const getFormattedResponseValue = (questionId: string, response: FormResponse) => {
    if (!currentForm) return '';
    
    const questionResponse = response.responses.find(r => r.questionId === questionId);
    if (!questionResponse) return '';
    
    const question = currentForm.questions?.find(q => q.id === questionId);
    if (!question) return '';
    
    // Verificar si la subpregunta debería estar visible
    if (question.parentId) {
      const parentQuestion = currentForm.questions.find(q => q.id === question.parentId);
      if (parentQuestion) {
        const parentResponse = response.responses.find(r => r.questionId === parentQuestion.id);
        if (!parentResponse) return '';
        
        let shouldShow = false;
        if (parentQuestion.type === 'select') {
          shouldShow = question.parentOptionId === parentResponse.value;
        } else if (parentQuestion.type === 'multiselect') {
          shouldShow = Array.isArray(parentResponse.value) && 
                      parentResponse.value.includes(question.parentOptionId);
        }
        
        if (!shouldShow) return '';
      }
    }
    
    switch (question.type) {
      case 'select':
        const option = question.options?.find(o => o.id === questionResponse.value);
        return option ? option.text : '';
        
      case 'multiselect':
        if (!Array.isArray(questionResponse.value)) return '';
        return question.options
          ?.filter(o => questionResponse.value.includes(o.id))
          .map(o => o.text)
          .join(', ') || '';
        
      case 'boolean':
        return questionResponse.value === true ? 'Sí' : questionResponse.value === false ? 'No' : '';
        
      case 'date':
        if (questionResponse.value) {
          return new Date(questionResponse.value as string).toLocaleDateString();
        }
        return '';
        
      default:
        return String(questionResponse.value || '');
    }
  };

  const renderEditableCell = (question: Question, responseId: string) => {
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

  const renderQuestionFilter = (question: Question) => {
    const currentFilter = filters.questionFilters[question.id];
    
    switch (question.type) {
      case 'select':
        return (
          <select
            value={currentFilter || ''}
            onChange={(e) => handleQuestionFilterChange(question.id, e.target.value)}
            className="w-full px-2 py-1 border rounded text-xs"
          >
            <option value="">Todos</option>
            {question.options?.map(option => (
              <option key={option.id} value={option.id}>
                {option.text}
              </option>
            ))}
          </select>
        );
        
      case 'multiselect':
        return (
          <div className="space-y-1">
            {question.options?.map(option => (
              <label key={option.id} className="flex items-center text-xs">
                <input
                  type="checkbox"
                  checked={(currentFilter as string[] || []).includes(option.id)}
                  onChange={(e) => {
                    const current = (currentFilter as string[]) || [];
                    const newValue = e.target.checked
                      ? [...current, option.id]
                      : current.filter(id => id !== option.id);
                    handleQuestionFilterChange(question.id, newValue);
                  }}
                  className="mr-1"
                />
                {option.text}
              </label>
            ))}
          </div>
        );
        
      case 'boolean':
        return (
          <select
            value={currentFilter || ''}
            onChange={(e) => handleQuestionFilterChange(question.id, e.target.value)}
            className="w-full px-2 py-1 border rounded text-xs"
          >
            <option value="">Todos</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        );
        
      case 'text':
      case 'number':
        return (
          <input
            type="text"
            value={currentFilter || ''}
            onChange={(e) => handleQuestionFilterChange(question.id, e.target.value)}
            placeholder="Filtrar..."
            className="w-full px-2 py-1 border rounded text-xs"
          />
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
  
  const formResponses = getFilteredAndSortedResponses();
  const visibleQuestions = getAllVisibleQuestions();
  
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
            <p className="text-sm text-gray-600 mt-2">
              Total de respuestas: {responses[id || '']?.length || 0} | Filtradas: {formResponses.length}
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 mt-4 md:mt-0">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
              <Filter size={16} className="mr-2" /> 
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </button>
            
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
                <Spinner size="sm" color="white" />
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

        {/* Panel de filtros */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha desde:
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha hasta:
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordenar por:
                </label>
                <div className="flex gap-2">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md"
                  >
                    <option value="createdAt">Fecha</option>
                    <option value="username">Usuario</option>
                    {visibleQuestions.map(question => (
                      <option key={question.id} value={question.id}>
                        {question.text}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border rounded-md hover:bg-gray-100"
                  >
                    {filters.sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        )}
        
        {formResponses.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="flex justify-center mb-4">
              <BarChart size={48} className="text-gray-400" />
            </div>
            <p className="text-gray-500">
              {(responses[id || '']?.length || 0) === 0 ? 'No hay respuestas' : 'No hay respuestas que coincidan con los filtros'}
            </p>
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
                  
                  {visibleQuestions.map((question) => {
                    const nestLevel = question.parentId ? 
                      currentForm.questions.filter(q => q.id === question.parentId).length : 0;
                    
                    return (
                      <th 
                        key={question.id} 
                        className="py-3 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]"
                      >
                        <div className="space-y-2">
                          <div className={nestLevel > 0 ? 'pl-4 border-l-2 border-l-green-300' : ''}>
                            {question.text}
                            {nestLevel > 0 && (
                              <span className="text-xs text-gray-400 block">
                                (Subpregunta)
                              </span>
                            )}
                          </div>
                          {showFilters && (
                            <div className="mt-2">
                              {renderQuestionFilter(question)}
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  
                  <th className="py-3 px-4 border-b text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-gray-200">
                {formResponses.map((response) => {
                  const completionPercentage = calculateCompletionPercentage(response);
                  const completionColorClass = getCompletionColor(completionPercentage);
                  
                  return (
                    <tr key={response.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm border-b sticky left-0 bg-white">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {formatDateDisplay(response.createdAt)}
                          </span>
                          <span className="text-sm text-gray-600 mt-1">
                            {response.username || 'Usuario Anónimo'}
                          </span>
                          <span className={`text-xs mt-1 px-2 py-1 rounded-full ${completionColorClass}`}>
                            {completionPercentage}% completo
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
                            <div className="max-w-xs truncate" title={getFormattedResponseValue(question.id, response)}>
                              {getFormattedResponseValue(question.id, response)}
                            </div>
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