import React from 'react';
import type { Question, QuestionType } from '../../types';

// Extender el tipo QuestionType para incluir los tipos adicionales
type ExtendedQuestionType = QuestionType | 'textarea' | 'radio' | 'checkbox';

interface FormFieldRendererProps {
  question: Omit<Question, 'type'> & { type: ExtendedQuestionType };
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

const FormFieldRenderer: React.FC<FormFieldRendererProps> = ({
  question,
  value,
  onChange,
  disabled = false,
}) => {
  const renderInputField = () => {
    switch (question.type) {
      case 'text':
        return (
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={question.required}
          />
        );
      
      // For textarea, we'll use a text input for now since TEXTAREA is not in QuestionType
      // You might want to add TEXTAREA to QuestionType if needed
      case 'textarea':
        return (
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={question.required}
          />
        );
      
      case 'select':
        return (
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={question.required}
          >
            <option value="">Seleccione una opción</option>
            {question.options?.map((option) => (
              <option key={option.id} value={option.id}>
                {option.text}
              </option>
            ))}
          </select>
        );
      
      case 'multiselect':
        return (
          <div className="space-y-2">
            {question.options?.map((option) => (
              <div key={option.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`${question.id}-${option.id}`}
                  checked={Array.isArray(value) ? value.includes(option.id) : false}
                  onChange={(e) => {
                    const newValue = Array.isArray(value) ? [...value] : [];
                    if (e.target.checked) {
                      newValue.push(option.id);
                    } else {
                      const index = newValue.indexOf(option.id);
                      if (index > -1) {
                        newValue.splice(index, 1);
                      }
                    }
                    onChange(newValue);
                  }}
                  disabled={disabled}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`${question.id}-${option.id}`} className="ml-2 block text-sm text-gray-700">
                  {option.text}
                </label>
              </div>
            ))}
          </div>
        );
        
      case 'radio':
        return (
          <div className="space-y-2">
            {question.options?.map((option) => (
              <div key={option.id} className="flex items-center">
                <input
                  type="radio"
                  id={`${question.id}-${option.id}`}
                  name={question.id}
                  value={option.id}
                  checked={value === option.id}
                  onChange={() => onChange(option.id)}
                  disabled={disabled}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  required={question.required}
                />
                <label htmlFor={`${question.id}-${option.id}`} className="ml-2 block text-sm text-gray-700">
                  {option.text}
                </label>
              </div>
            ))}
          </div>
        );
      
      // Checkbox is not in QuestionType, using MULTISELECT as a fallback
      // You might want to add CHECKBOX to QuestionType if needed
      case 'checkbox':
        return (
          <div className="space-y-2">
            {question.options?.map((option) => (
              <div key={option.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`${question.id}-${option.id}`}
                  checked={Array.isArray(value) ? value.includes(option.id) : false}
                  onChange={(e) => {
                    const newValue = Array.isArray(value) ? [...value] : [];
                    if (e.target.checked) {
                      newValue.push(option.id);
                    } else {
                      const index = newValue.indexOf(option.id);
                      if (index > -1) {
                        newValue.splice(index, 1);
                      }
                    }
                    onChange(newValue);
                  }}
                  disabled={disabled}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`${question.id}-${option.id}`} className="ml-2 block text-sm text-gray-700">
                  {option.text}
                </label>
              </div>
            ))}
          </div>
        );
      
      case 'date':
        return (
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={question.required}
          />
        );
      
      default:
        // Si el tipo no es reconocido, mostramos un mensaje de advertencia
        console.warn(`Tipo de pregunta no soportado: ${question.type}`);
        return (
          <div className="p-2 bg-yellow-100 text-yellow-800 rounded">
            Tipo de pregunta no soportado: {question.type}
          </div>
        );
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {question.text}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInputField()}
      {/* Description is not part of the Question interface
      {question.description && (
        <p className="mt-1 text-sm text-gray-500">{question.description}</p>
      )} */}
    </div>
  );
};

export default FormFieldRenderer;
