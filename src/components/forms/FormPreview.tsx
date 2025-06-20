import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from '../../contexts/FormContext';
import { FormResponse, QuestionResponse, Question } from '../../types';
import Spinner from '../ui/Spinner';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Download, Upload } from 'lucide-react';
import { generateOfflineForm } from '../../utils/offlineFormUtils';
import { readOfflineResponseFile } from '../../utils/excelUtils';

const FormPreview: React.FC = () => {
  const { id, responseId } = useParams<{ id: string; responseId?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { 
    loadForm, 
    currentForm, 
    saveResponse, 
    responses, 
    loadResponses, 
    isLoading,
    importResponses
  } = useForm();
  
  const [formResponses, setResponses] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const loadFormData = async () => {
      try {
        if (id) {
          await loadForm(id);
          if (responseId) {
            await loadResponses(id);
          }
        }
      } catch (error) {
        console.error('Error loading form data:', error);
        toast.error(t('error_loading_form'));
        navigate('/');
      }
    };

    loadFormData();
  }, [id, responseId]);

  useEffect(() => {
    if (responseId && responses[id!]) {
      const existingResponse = responses[id!].find(r => r.id === responseId);
      if (existingResponse) {
        const responseMap: Record<string, any> = {};
        existingResponse.responses.forEach(response => {
          responseMap[response.questionId] = response.value;
        });
        setResponses(responseMap);
      }
    }
  }, [responseId, responses, id]);

  // Función recursiva mejorada para obtener preguntas visibles incluyendo subpreguntas anidadas
  const getVisibleQuestions = (): Question[] => {
    if (!currentForm?.questions) return [];
    
    const visibleQuestions: Question[] = [];
    const processedQuestions = new Set<string>();
    
    const processQuestion = (question: Question, depth: number = 0) => {
      if (processedQuestions.has(question.id) || depth > 10) return;
      
      visibleQuestions.push(question);
      processedQuestions.add(question.id);
      
      if (question.type === 'select' || question.type === 'multiselect') {
        const parentResponse = formResponses[question.id];
        
        if (parentResponse) {
          const subQuestions = currentForm.questions.filter(q => q.parentId === question.id);
          
          subQuestions.forEach(subQuestion => {
            let shouldShow = false;
            
            if (question.type === 'select') {
              shouldShow = subQuestion.parentOptionId === parentResponse;
            } else if (question.type === 'multiselect') {
              shouldShow = Array.isArray(parentResponse) && 
                          parentResponse.includes(subQuestion.parentOptionId);
            }
            
            if (shouldShow) {
              processQuestion(subQuestion, depth + 1);
            }
          });
        }
      }
    };
    
    currentForm.questions
      .filter(q => !q.parentId)
      .forEach(q => processQuestion(q));
    
    return visibleQuestions;
  };

  const handleInputChange = (questionId: string, value: any) => {
    setResponses(prev => {
      const newResponses = { ...prev, [questionId]: value };
      
      const question = currentForm?.questions?.find(q => q.id === questionId);
      if (question && ['select', 'multiselect'].includes(question.type)) {
        const clearSubQuestions = (parentId: string) => {
          const subQuestions = currentForm?.questions?.filter(q => q.parentId === parentId);
          subQuestions?.forEach(subQ => {
            if (newResponses[subQ.id]) {
              delete newResponses[subQ.id];
              clearSubQuestions(subQ.id);
            }
          });
        };
        
        clearSubQuestions(questionId);
      }
      
      return newResponses;
    });
    
    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const visibleQuestions = getVisibleQuestions();
    
    visibleQuestions.forEach(question => {
      if (question.required) {
        const value = formResponses[question.id];
        
        if (value === undefined || value === null || value === '') {
          newErrors[question.id] = t('Este campo es obligatorio');
        }
        
        if (Array.isArray(value) && value.length === 0) {
          newErrors[question.id] = t('Selecciona al menos una opción');
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!currentForm || !id) return;
    
    if (!validateForm()) {
      toast.error(t('Por favor, completa todos los campos obligatorios'));
      return;
    }
    
    setSubmitting(true);
    
    try {
      const questionResponses: QuestionResponse[] = Object.entries(formResponses)
        .filter(([questionId]) => {
          const question = currentForm.questions.find(q => q.id === questionId);
          return question && getVisibleQuestions().includes(question);
        })
        .map(([questionId, value]) => ({
          questionId,
          value
        }));
      
      const formResponse: Omit<FormResponse, 'id' | 'createdAt'> = {
        formId: id,
        formVersion: currentForm.version,
        responses: questionResponses,
        updatedOffline: false,
        userId: '',
        username: ''
      };
      
      await saveResponse(formResponse);
      toast.success(t('Respuestas guardadas correctamente'));
      navigate(`/respuestas/${id}`);
    } catch (error) {
      console.error('Error saving response:', error);
      toast.error(t('Error al guardar las respuestas'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportBlank = async () => {
    if (!currentForm) return;
    
    try {
      const htmlContent = await generateOfflineForm(currentForm);
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `formulario_${currentForm.name.replace(/\s+/g, '_').toLowerCase()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('Formulario exportado correctamente'));
    } catch (error) {
      console.error('Error exporting form:', error);
      toast.error(t('Error al exportar el formulario'));
    }
  };

  // Función CORREGIDA para importar respuestas - ESTRUCTURA EXACTA PARA PHP
  const handleImportOfflineResponses = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentForm || !id) return;
    
    try {
      setImporting(true);
      console.log('🚀 Importando respuestas para formulario:', id);
      
      // 1. Leer el archivo Excel y procesar las respuestas
      const processedResponses = await readOfflineResponseFile(file, currentForm);
      console.log('📦 Respuestas procesadas del Excel:', processedResponses);

      // 2. Validar que hay respuestas válidas
      if (!Array.isArray(processedResponses) || processedResponses.length === 0) {
        throw new Error('No se encontraron respuestas válidas en el archivo');
      }

      // 3. Preparar el payload EXACTO que espera el backend PHP
      // Según el código PHP, espera: { formId: string, responses: array }
      const payload = {
        formId: id, // ✅ ID del formulario actual
        responses: processedResponses.map(response => ({
          form_version: response.formVersion || currentForm.version,
          responses: response.responses.map(r => ({
            questionId: r.questionId, // ✅ Mantener questionId como espera el backend
            value: r.value
          })),
          updated_offline: true
        }))
      };

      console.log('📤 Payload FINAL para backend PHP:', JSON.stringify(payload, null, 2));

      // 4. Enviar al backend usando la función del contexto
      await importResponses(payload);
      
      toast.success(`${processedResponses.length} respuesta(s) importada(s) correctamente`);
      
      // 5. Recargar respuestas para mostrar las nuevas
      await loadResponses(id);
      
    } catch (error) {
      console.error('❌ Error en importación:', error);
      toast.error(`Error al importar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const calculateNestLevel = (question: Question): number => {
    let level = 0;
    let currentQuestion = question;
    
    while (currentQuestion.parentId && level < 10) {
      const parentQuestion = currentForm?.questions.find(q => q.id === currentQuestion.parentId);
      if (!parentQuestion) break;
      level++;
      currentQuestion = parentQuestion;
    }
    
    return level;
  };

  const renderQuestionInput = (question: Question) => {
    switch (question.type) {
      case 'text':
        return (
          <input
            type="text"
            value={formResponses[question.id] || ''}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
              errors[question.id] ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        );
        
      case 'number':
        return (
          <input
            type="number"
            value={formResponses[question.id] || ''}
            onChange={(e) => handleInputChange(question.id, e.target.value ? parseFloat(e.target.value) : '')}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
              errors[question.id] ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        );
        
      case 'date':
        return (
          <input
            type="date"
            value={formResponses[question.id] || ''}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
              errors[question.id] ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        );
        
      case 'boolean':
        return (
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                checked={formResponses[question.id] === true}
                onChange={() => handleInputChange(question.id, true)}
                className="h-5 w-5 text-green-600 focus:ring-green-500"
              />
              <span className="ml-2">{t('Sí')}</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                checked={formResponses[question.id] === false}
                onChange={() => handleInputChange(question.id, false)}
                className="h-5 w-5 text-green-600 focus:ring-green-500"
              />
              <span className="ml-2">{t('No')}</span>
            </label>
          </div>
        );
        
      case 'select':
        return (
          <select
            value={formResponses[question.id] || ''}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
              errors[question.id] ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">{t('Seleccionar...')}</option>
            {question.options?.map(option => (
              <option key={option.id} value={option.id}>
                {option.text}
              </option>
            ))}
          </select>
        );
        
      case 'multiselect':
        return (
          <div className="space-y-2">
            {question.options?.map(option => (
              <label key={option.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(formResponses[question.id] || []).includes(option.id)}
                  onChange={(e) => {
                    const currentValues = formResponses[question.id] || [];
                    const newValues = e.target.checked
                      ? [...currentValues, option.id]
                      : currentValues.filter((id: string) => id !== option.id);
                    handleInputChange(question.id, newValues);
                  }}
                  className="h-5 w-5 text-green-600 focus:ring-green-500 rounded"
                />
                <span className="ml-2">{option.text}</span>
              </label>
            ))}
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
              <ArrowLeft size={16} className="mr-1" /> {t('Volver')}
            </button>
            <h1 className="text-2xl font-bold text-gray-800">
              {responseId ? t('Editar Respuesta: ') : ''}{currentForm.name}
            </h1>
            {currentForm.description && (
              <p className="text-gray-600 mt-2">{currentForm.description}</p>
            )}
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 mt-4 md:mt-0">
            {!responseId && (
              <>
                <button
                  type="button"
                  onClick={handleExportBlank}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center"
                >
                  <Download size={16} className="mr-2" /> {t('Exportar para completar sin conexión')}
                </button>
                
                <label className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center cursor-pointer">
                  <Upload size={16} className="mr-2" />
                  {importing ? 'Importando...' : 'Importar Respuestas Excel'}
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportOfflineResponses}
                    className="hidden"
                    disabled={importing}
                  />
                </label>
              </>
            )}
          </div>
        </div>
        
        <div className="space-y-8 mt-8">
          {getVisibleQuestions().map((question) => {
            const nestLevel = calculateNestLevel(question);
            
            return (
              <div 
                key={question.id} 
                className={`border-b border-gray-200 pb-6 ${
                  nestLevel > 0 ? 'border-l-2 border-l-green-200 pl-4' : ''
                }`}
                style={{
                  marginLeft: nestLevel > 0 ? `${Math.min(nestLevel * 2, 8)}rem` : '0'
                }}
              >
                <div className="mb-2 flex items-start">
                  <label className="block text-gray-800 font-medium">
                    {question.text}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                    {nestLevel > 0 && (
                      <span className="text-sm text-gray-500 ml-2">
                        (Subpregunta nivel {nestLevel})
                      </span>
                    )}
                  </label>
                </div>
                
                <div className="mt-2">
                  {renderQuestionInput(question)}
                  {errors[question.id] && (
                    <p className="mt-1 text-sm text-red-500">{errors[question.id]}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-end mt-8">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
          >
            {submitting ? (
              <Spinner size="sm" color="white" />
            ) : (
              <>
                <Save size={16} className="mr-2" /> 
                {responseId ? t('Actualizar') : t('Guardar')} {t('Respuestas')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormPreview;