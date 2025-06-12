import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from '../../contexts/FormContext';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { Question, QuestionType, Form } from '../../types';
import QuestionEditor from './QuestionEditor';
import Spinner from '../ui/Spinner';
import toast from 'react-hot-toast';

const FormBuilder: React.FC = () => {
  // ======================
  // HOOKS Y ESTADO INICIAL
  // ======================
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loadForm, saveForm, currentForm, isLoading } = useForm();
  const { t } = useTranslation();
  
  const initialFormState = {
    name: '',
    description: '',
    questions: []
  };
  
  const [formData, setFormData] = useState(initialFormState);

  // ======================
  // EFECTOS SECUNDARIOS
  // ======================

  // Carga el formulario cuando el ID cambia
  useEffect(() => {
    if (id) {
      loadForm(id);
    } else {
      setFormData(initialFormState);
    }
  }, [id]);

  // Sincroniza el estado local con el formulario cargado
  useEffect(() => {
    if (currentForm && id) {
      setFormData({
        name: currentForm.name,
        description: currentForm.description,
        questions: currentForm.questions
      });
    }
  }, [currentForm, id]);

  // ======================
  // MANEJO DE PREGUNTAS
  // ======================

  /**
   * Agrega una nueva pregunta al formulario
   */
  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: uuidv4(),
      text: '',
      type: 'text' as QuestionType,
      required: false,
      includeInPowerBI: false
    };
    
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  /**
   * Actualiza una pregunta existente
   * @param updatedQuestion - Pregunta con los cambios
   */
  const handleUpdateQuestion = (updatedQuestion: Question) => {
    const questionWithValidId = {
      ...updatedQuestion,
      id: updatedQuestion.id || uuidv4()
    };
    
    setFormData(prev => {
      if (!prev.questions.find(q => q.id === questionWithValidId.id)) {
        return {
          ...prev,
          questions: [...prev.questions, questionWithValidId]
        };
      }
      
      return {
        ...prev,
        questions: prev.questions.map(q => 
          q.id === questionWithValidId.id ? questionWithValidId : q
        )
      };
    });
  };

  /**
   * Elimina una pregunta y sus subpreguntas
   * @param questionId - ID de la pregunta a eliminar
   */
  const handleDeleteQuestion = (questionId: string) => {
    setFormData(prev => {
      const questionsToDelete = new Set<string>();
      
      const findQuestionsToDelete = (qId: string) => {
        questionsToDelete.add(qId);
        prev.questions.forEach(q => {
          if (q.parentId === qId) {
            findQuestionsToDelete(q.id);
          }
        });
      };
      
      findQuestionsToDelete(questionId);
      
      return {
        ...prev,
        questions: prev.questions.filter(q => !questionsToDelete.has(q.id))
      };
    });
  };

  // ======================
  // REORGANIZACIÓN DE PREGUNTAS
  // ======================

  /**
   * Reorganiza preguntas con IDs secuenciales manteniendo jerarquías
   * @param questions - Array de preguntas a reorganizar
   * @returns Array de preguntas reorganizadas
   */
  const reorganizeQuestions = (questions: Question[]): Question[] => {
    const mainQuestions = questions.filter(q => !q.parentId);
    const subQuestions = questions.filter(q => q.parentId);
    
    const questionsByParent = new Map<string, Question[]>();
    subQuestions.forEach(q => {
      if (!questionsByParent.has(q.parentId!)) {
        questionsByParent.set(q.parentId!, []);
      }
      questionsByParent.get(q.parentId!)!.push(q);
    });
    
    const processQuestionHierarchy = (question: Question): Question[] => {
      const result: Question[] = [question];
      
      if (question.options) {
        question.options.forEach(option => {
          const optionSubQuestions = questionsByParent.get(question.id)?.filter(
            q => q.parentOptionId === option.id
          ) || [];
          
          optionSubQuestions.forEach(subQ => {
            result.push(...processQuestionHierarchy(subQ));
          });
        });
      }
      
      return result;
    };
    
    const organizedQuestions = mainQuestions.flatMap(q => processQuestionHierarchy(q));
    
    const idMap = new Map<string, string>();
    
    return organizedQuestions.map((q, index) => {
      const oldId = q.id;
      const newId = `q${(index + 1).toString().padStart(3, '0')}`;
      idMap.set(oldId, newId);
      
      return {
        ...q,
        id: newId,
        parentId: q.parentId ? idMap.get(q.parentId) : undefined,
        parentOptionId: q.parentOptionId
      };
    });
  };

  // ======================
  // GUARDADO DEL FORMULARIO (CORRECCIÓN PRINCIPAL)
  // ======================

  /**
   * Maneja el guardado del formulario con validaciones y estructura correcta
   */
  const handleSaveForm = async () => {
    if (!formData.name.trim()) {
      toast.error(t('El nombre del formulario es obligatorio'));
      return;
    }

    if (id && !currentForm) {
      toast.error(t('El formulario no se encuentra'));
      navigate('/');
      return;
    }
    
    try {
      // Prepara los datos para enviar al backend
      const formToSave = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        questions: formData.questions
          .filter(q => q.text.trim() !== '') // Filtra preguntas vacías
          .map(q => ({
            ...q,
            id: q.id || uuidv4(), // Asegura IDs válidos
            text: q.text.trim() // Limpia texto de preguntas
          }))
      };

      // Depuración: muestra datos que se enviarán
      console.log('Preparando para guardar:', JSON.stringify(formToSave, null, 2));

      // Intenta guardar el formulario
      const savedId = await saveForm(formToSave);
      
      // Feedback al usuario
      toast.success(t('Formulario guardado correctamente'));
      
      // Resetea estado si es nuevo formulario
      if (!id) {
        setFormData(initialFormState);
      }
      
      // Navega a vista previa
      navigate(`/vista-previa/${savedId}`);
    } catch (error) {
      console.error('Error al guardar el formulario:', error);
      toast.error(t('Error al guardar el formulario: ') + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  // Filtra solo preguntas principales para mostrar
  const mainQuestions = formData.questions.filter(q => !q.parentId);

  // ======================
  // RENDERIZADO
  // ======================

  if (isLoading && id) {
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
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {id ? `Editar: ${formData.name}` : t('Crear Formulario')}
        </h1>
        
        <div className="space-y-6">
          {/* Información básica del formulario */}
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('Nombre del Formulario')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder={t('Nombre del formulario')}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('Descripción')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder={t('Descripción del formulario')}
                rows={3}
              />
            </div>
          </div>
          
          {/* Sección de preguntas */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-700">{t('Preguntas')}</h2>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
              >
                <span className="mr-1">+</span> {t('Agregar Pregunta')}
              </button>
            </div>
            
            {mainQuestions.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">{t('No hay preguntas en este formulario')}</p>
                <p className="text-sm text-gray-400 mt-2">{t('Haz clic en "Agregar Pregunta" para comenzar')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {mainQuestions.map((question, index) => (
                  <QuestionEditor
                    key={question.id}
                    question={question}
                    allQuestions={formData.questions}
                    onUpdate={handleUpdateQuestion}
                    onDelete={() => handleDeleteQuestion(question.id)}
                    onMoveUp={() => handleMoveQuestionUp(index)}
                    onMoveDown={() => handleMoveQuestionDown(index)}
                    canMoveUp={index > 0}
                    canMoveDown={index < mainQuestions.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Botones de acción */}
          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t('Cancelar')}
            </button>
            <button
              type="button"
              onClick={handleSaveForm}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? <Spinner size="sm" /> : t('Guardar')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;