import React from 'react';
import type { Question } from '../../types';
import { Star } from 'lucide-react';

interface FormFieldRendererProps {
  question: Question;
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
      case 'email':
      case 'tel':
      case 'url':
        return (
          <input
            type={question.type}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={question.required}
            placeholder={question.placeholder}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={value || ''}
            onChange={(e) => onChange(e.target.valueAsNumber || '')}
            disabled={disabled}
            required={question.required}
            min={question.validation?.min}
            max={question.validation?.max}
            step={question.validation?.step || 'any'}
          />
        );
      
      case 'range':
        return (
          <div className="w-full">
            <input
              type="range"
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              value={value || 0}
              onChange={(e) => onChange(Number(e.target.value))}
              disabled={disabled}
              min={question.validation?.min || 0}
              max={question.validation?.max || 100}
              step={question.validation?.step || 1}
            />
            <div className="text-sm text-gray-600 mt-1">
              {value || 0} {question.suffix || ''}
            </div>
          </div>
        );
      
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
            onChange={(e) => onChange(e.target.value || null)}
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
      
      case 'boolean':
        return (
          <div className="flex items-center space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                checked={value === true}
                onChange={() => onChange(true)}
                disabled={disabled}
              />
              <span className="ml-2">Sí</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                checked={value === false}
                onChange={() => onChange(false)}
                disabled={disabled}
              />
              <span className="ml-2">No</span>
            </label>
          </div>
        );
        
      case 'rating':
        return (
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="p-1 focus:outline-none"
                onClick={() => !disabled && onChange(star)}
                disabled={disabled}
              >
                {value >= star ? (
                  <Star className="w-6 h-6 text-yellow-400 fill-current" />
                ) : (
                  <Star className="w-6 h-6 text-gray-300" />
                )}
              </button>
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
            min={question.min}
            max={question.max}
          />
        );
      
      case 'time':
        return (
          <input
            type="time"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={question.required}
            step={question.step || 60} // Por defecto, pasos de 1 minuto
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
