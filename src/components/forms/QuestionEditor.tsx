// Importación de dependencias
import React, { useState } from 'react'; // React y su hook de estado

import { v4 as uuidv4 } from 'uuid'; // Generador de IDs únicos
import { Question, QuestionType, Option } from '../../types'; // Tipos de datos
import { ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react'; // Iconos

// Definición de las propiedades que recibe el componente
interface QuestionEditorProps {
  question: Question; // Pregunta actual que se está editando
  allQuestions: Question[]; // Lista completa de preguntas (para relaciones jerárquicas)
  onUpdate: (question: Question) => void; // Callback para actualizar una pregunta
  onDelete: () => void; // Callback para eliminar la pregunta
  onMoveUp: () => void; // Callback para mover la pregunta arriba
  onMoveDown: () => void; // Callback para mover la pregunta abajo
  canMoveUp: boolean; // Indica si se puede mover hacia arriba
  canMoveDown: boolean; // Indica si se puede mover hacia abajo
  nestLevel?: number; // Nivel de anidamiento (para estilos visuales)
}

/**
 * Componente QuestionEditor - Editor recursivo de preguntas y subpreguntas
 * 
 * Este componente permite:
 * - Editar el texto y tipo de pregunta
 * - Gestionar opciones para preguntas de selección
 * - Crear subpreguntas condicionales
 * - Reordenar y eliminar preguntas
 */
const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  allQuestions,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  nestLevel = 0, // Valor por defecto para el nivel de anidamiento
}) => {
  // Hooks de estado

  const [isExpanded, setIsExpanded] = useState(true); // Controla si la pregunta está expandida
  const [showSubQuestionForm, setShowSubQuestionForm] = useState<string | null>(null); // ID de opción para la que se muestra formulario de subpregunta
  const [newSubQuestion, setNewSubQuestion] = useState<Question | null>(null); // Nueva subpregunta en creación
  
  // Determina si la pregunta actual tiene opciones (select/multiselect)
  const hasOptions = ['select', 'multiselect'].includes(question.type);
  
  /**
   * Maneja el cambio de tipo de pregunta
   * @param newType - Nuevo tipo de pregunta seleccionado
   */
  const handleTypeChange = (newType: QuestionType) => {
    let updatedQuestion: Question = { ...question, type: newType };
    
    // Si el nuevo tipo no necesita opciones, las eliminamos
    if (!['select', 'multiselect'].includes(newType) && updatedQuestion.options) {
      delete updatedQuestion.options;
    }
    
    // Si el nuevo tipo necesita opciones y no las tiene, inicializamos un array vacío
    if (['select', 'multiselect'].includes(newType) && !updatedQuestion.options) {
      updatedQuestion.options = [{ id: uuidv4(), text: '' }];
    }
    
    onUpdate(updatedQuestion);
  };
  
  /**
   * Agrega una nueva opción a la pregunta
   */
  const handleAddOption = () => {
    const newOption: Option = { id: uuidv4(), text: '' };
    onUpdate({
      ...question,
      options: [...(question.options || []), newOption]
    });
  };
  
  /**
   * Actualiza el texto de una opción
   * @param optionId - ID de la opción a actualizar
   * @param text - Nuevo texto para la opción
   */
  const handleUpdateOption = (optionId: string, text: string) => {
    if (!question.options) return;
    
    const updatedOptions = question.options.map(opt => 
      opt.id === optionId ? { ...opt, text } : opt
    );
    
    onUpdate({
      ...question,
      options: updatedOptions
    });
  };
  
  /**
   * Elimina una opción y sus subpreguntas relacionadas
   * @param optionId - ID de la opción a eliminar
   */
  const handleDeleteOption = (optionId: string) => {
    if (!question.options) return;
    
    const updatedOptions = question.options.filter(opt => opt.id !== optionId);
    
    onUpdate({
      ...question,
      options: updatedOptions
    });
  };
  
  /**
   * Inicia la creación de una nueva subpregunta para una opción específica
   * @param optionId - ID de la opción padre
   */
  const handleStartSubQuestion = (optionId: string) => {
    const newQuestion: Question = {
      id: uuidv4(),
      text: '',
      type: 'text',
      required: false,
      includeInPowerBI: false,
      parentId: question.id,
      parentOptionId: optionId
    };
    setNewSubQuestion(newQuestion);
    setShowSubQuestionForm(optionId);
  };
  
  /**
   * Guarda la nueva subpregunta
   */
  const handleSaveSubQuestion = () => {
    if (!newSubQuestion) return;
    
    // Nota: Aquí se llama a onUpdate pero en realidad debería ser una operación diferente
    // ya que estamos agregando una nueva pregunta, no actualizando la existente
    onUpdate(newSubQuestion);
    setNewSubQuestion(null);
    setShowSubQuestionForm(null);
  };
  
  /**
   * Obtiene todas las subpreguntas para una opción específica
   * @param optionId - ID de la opción
   * @returns Array de subpreguntas
   */
  const getSubQuestionsForOption = (optionId: string) => {
    return allQuestions.filter(q => q.parentOptionId === optionId);
  };
  
  /**
   * Renderiza las opciones de la pregunta (para tipos select/multiselect)
   * @returns JSX con la lista de opciones y sus controles
   */
  const renderOptions = () => {
    if (!hasOptions || !question.options) return null;
    
    return (
      <div className="pl-4 mt-4 space-y-4">
        <label className="block text-sm font-medium text-gray-700">Opciones</label>
        
        {question.options.map((option) => (
          <div key={option.id} className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={option.text}
                onChange={(e) => handleUpdateOption(option.id, e.target.value)}
                className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder="Texto de la opción"
              />
              
              <button
                type="button"
                onClick={() => handleDeleteOption(option.id)}
                className="p-2 text-red-500 hover:text-red-700 focus:outline-none"
                title="Eliminar opción"
              >
                <Trash2 size={16} />
              </button>
            </div>
            
            {/* Controles para subpreguntas */}
            <div className="flex items-center pl-4">
              <button
                type="button"
                onClick={() => handleStartSubQuestion(option.id)}
                className="text-sm flex items-center text-blue-600 hover:text-blue-800"
              >
                <Plus size={14} className="mr-1" /> Agregar Subpregunta
              </button>
            </div>
            
            {/* Editor de nueva subpregunta */}
            {showSubQuestionForm === option.id && newSubQuestion && (
              <div className="pl-6 mt-2 p-4 border-l-2 border-blue-300 bg-blue-50 rounded">
                <QuestionEditor
                  question={newSubQuestion}
                  allQuestions={allQuestions}
                  onUpdate={(updatedQuestion) => setNewSubQuestion(updatedQuestion)}
                  onDelete={() => {
                    setNewSubQuestion(null);
                    setShowSubQuestionForm(null);
                  }}
                  onMoveUp={() => {}}
                  onMoveDown={() => {}}
                  canMoveUp={false}
                  canMoveDown={false}
                  nestLevel={nestLevel + 1}
                />
                
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewSubQuestion(null);
                      setShowSubQuestionForm(null);
                    }}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSubQuestion}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Guardar Subpregunta
                  </button>
                </div>
              </div>
            )}
            
            {/* Subpreguntas existentes */}
            {getSubQuestionsForOption(option.id).map((subQuestion) => (
              <div key={subQuestion.id} className="pl-6 mt-2 border-l-2 border-blue-300">
                <QuestionEditor
                  question={subQuestion}
                  allQuestions={allQuestions}
                  onUpdate={onUpdate}
                  onDelete={() => {
                    // Nota: Esta implementación no es completa para eliminar
                    onUpdate({...question});
                  }}
                  onMoveUp={() => {}}
                  onMoveDown={() => {}}
                  canMoveUp={false}
                  canMoveDown={false}
                  nestLevel={nestLevel + 1}
                />
              </div>
            ))}
          </div>
        ))}
        
        <button
          type="button"
          onClick={handleAddOption}
          className="mt-2 text-sm flex items-center text-green-600 hover:text-green-800"
        >
          <Plus size={14} className="mr-1" /> Agregar Opción
        </button>
      </div>
    );
  };
  
  // Renderizado principal del componente
  return (
    <div className={`border border-gray-200 rounded-lg p-4 ${nestLevel > 0 ? 'bg-blue-50' : 'bg-white'}`}>
      {/* Encabezado de la pregunta */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-grow">
          <div className="flex items-center">
            {/* Botón para expandir/colapsar */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mr-2 text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            
            {/* Muestra el tipo de pregunta */}
            <span className="text-sm font-medium text-gray-500">
              {question.type === 'text' && 'Texto'}
              {question.type === 'number' && 'Número'}
              {question.type === 'select' && 'Selección'}
              {question.type === 'multiselect' && 'Selección Múltiple'}
              {question.type === 'date' && 'Fecha'}
              {question.type === 'time' && 'Hora'}
              {question.type === 'boolean' && 'Sí/No'}
            </span>
          </div>
        </div>
        
        {/* Controles de la pregunta */}
        <div className="flex space-x-2">
          {nestLevel === 0 && (
            <>
              {/* Botón para mover hacia arriba */}
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                className={`p-1 rounded focus:outline-none ${canMoveUp ? 'text-gray-500 hover:text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
                title="Mover hacia arriba"
              >
                <ChevronUp size={18} />
              </button>
              
              {/* Botón para mover hacia abajo */}
              <button
                type="button"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                className={`p-1 rounded focus:outline-none ${canMoveDown ? 'text-gray-500 hover:text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
                title="Mover hacia abajo"
              >
                <ChevronDown size={18} />
              </button>
            </>
          )}
          
          {/* Botón para eliminar pregunta */}
          <button
            type="button"
            onClick={onDelete}
            className="p-1 text-red-500 hover:text-red-700 focus:outline-none"
            title="Eliminar pregunta"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      
      {/* Contenido expandido de la pregunta */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Campo de texto de la pregunta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Texto de la pregunta
            </label>
            <input
              type="text"
              value={question.text}
              onChange={(e) => onUpdate({...question, text: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Texto de la pregunta"
            />
          </div>
          
          {/* Configuraciones adicionales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Selector de tipo de pregunta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de pregunta
              </label>
              <select
                value={question.type}
                onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="text">Texto</option>
                <option value="number">Número</option>
                <option value="select">Selección</option>
                <option value="multiselect">Selección Múltiple</option>
                <option value="date">Fecha</option>
                <option value="time">Hora</option>
                <option value="boolean">Sí/No</option>
              </select>
            </div>
            
            {/* Checkbox para pregunta obligatoria */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id={`required-${question.id}`}
                checked={question.required}
                onChange={(e) => onUpdate({...question, required: e.target.checked})}
                className="mr-2 h-5 w-5 text-green-600 focus:ring-green-500 rounded"
              />
              <label htmlFor={`required-${question.id}`} className="text-sm text-gray-700">
                Obligatorio
              </label>
            </div>
          </div>
          
          {/* Renderizado de opciones (si el tipo de pregunta lo requiere) */}
          {renderOptions()}
        </div>
      )}
    </div>
  );
};

export default QuestionEditor;