import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Internacionalización
import { useForm } from '../../contexts/FormContext'; // Contexto para manejar formularios
import { FormResponse, QuestionResponse, Question } from '../../types'; // Tipos de datos
import Spinner from '../ui/Spinner'; // Componente de carga
import toast from 'react-hot-toast'; // Notificaciones
import { ArrowLeft, Save, Download } from 'lucide-react'; // Íconos
import { exportToExcel } from '../../utils/excelUtils'; // Utilidad para exportar a Excel
console.log("Forms peviu");
const FormPreview: React.FC = () => {
  // ======================
  // HOOKS Y ESTADO INICIAL
  // ======================
  const { id, responseId } = useParams<{ id: string; responseId?: string }>(); // IDs de URL
  const navigate = useNavigate(); // Navegación programática
  const { t } = useTranslation(); // Función de traducción
  const { 
    loadForm, 
    currentForm, 
    saveResponse, 
    responses, 
    loadResponses, 
    isLoading 
  } = useForm(); // Funciones del contexto
  
  // Estado para las respuestas del formulario
  const [formResponses, setResponses] = useState<Record<string, any>>({});
  // Estado para errores de validación
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Estado para controlar envío
  const [submitting, setSubmitting] = useState(false);

  // ======================
  // EFECTOS SECUNDARIOS
  // ======================

  // Carga el formulario y respuestas cuando cambian los IDs
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

  // Sincroniza respuestas cuando cambian los datos cargados
  useEffect(() => {
    if (responseId && responses[id!]) {
      // Busca la respuesta existente
      const existingResponse = responses[id!].find(r => r.id === responseId);
      if (existingResponse) {
        // Mapea las respuestas a un objeto {questionId: value}
        const responseMap: Record<string, any> = {};
        existingResponse.responses.forEach(response => {
          responseMap[response.questionId] = response.value;
        });
        setResponses(responseMap);
      }
    }
  }, [responseId, responses, id]);

  // ======================
  // LÓGICA DE PREGUNTAS
  // ======================

  /**
   * Obtiene preguntas visibles basadas en respuestas condicionales
   * @returns Array de preguntas visibles
   */
  const getVisibleQuestions = () => {
  if (!currentForm?.questions) return [];
  
  const visibleQuestions: Question[] = [];
  const processedQuestions = new Set<string>();
  
  currentForm.questions.forEach(question => {
    if (!question.parentId && !processedQuestions.has(question.id)) {
      visibleQuestions.push(question);
      processedQuestions.add(question.id);
      
      // Procesar subpreguntas si la pregunta padre tiene respuesta
      if (question.type === 'select' || question.type === 'multiselect') {
        const parentResponse = formResponses[question.id];
        if (parentResponse) {
          currentForm.questions.forEach(subQuestion => {
            if (subQuestion.parentId === question.id && 
                ((question.type === 'select' && subQuestion.parentOptionId === parentResponse) ||
                 (question.type === 'multiselect' && Array.isArray(parentResponse) && 
                  parentResponse.includes(subQuestion.parentOptionId)))) {
              visibleQuestions.push(subQuestion);
              processedQuestions.add(subQuestion.id);
            }
          });
        }
      }
    }
  });
  
  return visibleQuestions;
};

  /**
   * Maneja cambios en las respuestas
   * @param questionId - ID de la pregunta
   * @param value - Nuevo valor
   */
  const handleInputChange = (questionId: string, value: any) => {
    setResponses(prev => {
      const newResponses = { ...prev, [questionId]: value };
      
      // Limpia respuestas de subpreguntas cuando cambia la padre
      const question = currentForm?.questions?.find(q => q.id === questionId);
      if (question && ['select', 'multiselect'].includes(question.type)) {
        const subQuestions = currentForm?.questions?.filter(q => q.parentId === questionId);
        subQuestions?.forEach(subQ => {
          if (newResponses[subQ.id]) {
            delete newResponses[subQ.id];
          }
        });
      }
      
      return newResponses;
    });
    
    // Limpia error si existía
    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  // ======================
  // VALIDACIÓN Y ENVÍO
  // ======================

  /**
   * Valida el formulario
   * @returns true si es válido, false si hay errores
   */
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const visibleQuestions = getVisibleQuestions();
    
    visibleQuestions.forEach(question => {
      if (question.required) {
        const value = formResponses[question.id];
        
        // Validación para diferentes tipos
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

  /**
   * Maneja el envío del formulario
   */
  const handleSubmit = async () => {
    if (!currentForm || !id) return;
    
    // Validación
    if (!validateForm()) {
      toast.error(t('Por favor, completa todos los campos obligatorios'));
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Prepara las respuestas
      const questionResponses: QuestionResponse[] = Object.entries(formResponses)
        .filter(([questionId]) => {
          const question = currentForm.questions.find(q => q.id === questionId);
          return question && getVisibleQuestions().includes(question);
        })
        .map(([questionId, value]) => ({
          questionId,
          value
        }));
      
      // Crea el objeto de respuesta
      const formResponse: Omit<FormResponse, 'id' | 'createdAt'> = {
        formId: id,
        formVersion: currentForm.version,
        responses: questionResponses,
        updatedOffline: false
      };
      
      // Guarda la respuesta
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

  // ======================
  // EXPORTACIÓN
  // ======================

  /**
   * Exporta el formulario en blanco a Excel
   */
  const handleExportBlank = async () => {
    if (!currentForm) return;
    
    try {
      await exportToExcel(
        null,
        `formulario_${currentForm.name.replace(/\s+/g, '_').toLowerCase()}.xlsx`,
        currentForm
      );
      toast.success(t('Formulario exportado correctamente'));
    } catch (error) {
      console.error('Error exporting form:', error);
      toast.error(t('Error al exportar el formulario'));
    }
  };

  // ======================
  // RENDERIZADO DE INPUTS
  // ======================

  /**
   * Renderiza el input adecuado para cada tipo de pregunta
   * @param question - Pregunta a renderizar
   * @returns Componente de input
   */
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
        
      // ... otros casos (number, date, boolean, select, multiselect)
      
      default:
        return null;
    }
  };

  // ======================
  // RENDERIZADO PRINCIPAL
  // ======================

  // Muestra spinner mientras carga
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
        {/* Encabezado */}
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
          
          {/* Botón de exportación (solo en modo nuevo) */}
          {!responseId && (
            <button
              type="button"
              onClick={handleExportBlank}
              className="mt-4 md:mt-0 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center"
            >
              <Download size={16} className="mr-2" /> {t('Exportar para completar sin conexión')}
            </button>
          )}
        </div>
        
        {/* Lista de preguntas */}
        <div className="space-y-8 mt-8">
          {getVisibleQuestions().map((question) => (
            <div 
              key={question.id} 
              className={`border-b border-gray-200 pb-6 ${
                question.parentId ? 'ml-8 border-l-2 border-l-green-200 pl-4' : ''
              }`}
            >
              <div className="mb-2 flex items-start">
                <label className="block text-gray-800 font-medium">
                  {question.text}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </label>
              </div>
              
              <div className="mt-2">
                {renderQuestionInput(question)}
                {errors[question.id] && (
                  <p className="mt-1 text-sm text-red-500">{errors[question.id]}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Botón de guardar */}
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