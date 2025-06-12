import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Form, FormResponse, FormContextState } from '../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';

// Tipos de acciones para el reducer
type FormAction = 
  | { type: 'SET_FORMS'; payload: Form[] }
  | { type: 'SET_CURRENT_FORM'; payload: Form | null }
  | { type: 'SET_RESPONSES'; payload: { formId: string, responses: FormResponse[] } }
  | { type: 'ADD_FORM'; payload: Form }
  | { type: 'UPDATE_FORM'; payload: Form }
  | { type: 'DELETE_FORM'; payload: string }
  | { type: 'ADD_RESPONSE'; payload: FormResponse }
  | { type: 'DELETE_RESPONSE'; payload: { formId: string, responseId: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// Estado inicial del contexto
const initialState: FormContextState = {
  forms: [],
  currentForm: null,
  responses: {},
  isLoading: false,
  error: null
};

// Reducer para manejar el estado
const formReducer = (state: FormContextState, action: FormAction): FormContextState => {
  switch (action.type) {
    case 'SET_FORMS':
      return { ...state, forms: action.payload };
    case 'SET_CURRENT_FORM':
      return { ...state, currentForm: action.payload };
    case 'SET_RESPONSES':
      return { 
        ...state, 
        responses: { 
          ...state.responses, 
          [action.payload.formId]: action.payload.responses 
        } 
      };
    case 'ADD_FORM':
      return { ...state, forms: [...state.forms, action.payload] };
    case 'UPDATE_FORM':
      return { 
        ...state, 
        forms: state.forms.map(form => 
          form.id === action.payload.id ? action.payload : form
        ),
        currentForm: state.currentForm?.id === action.payload.id 
          ? action.payload 
          : state.currentForm
      };
    case 'DELETE_FORM':
      return { 
        ...state, 
        forms: state.forms.filter(form => form.id !== action.payload),
        currentForm: state.currentForm?.id === action.payload ? null : state.currentForm
      };
    case 'ADD_RESPONSE':
      const existingResponses = state.responses[action.payload.formId] || [];
      return {
        ...state,
        responses: {
          ...state.responses,
          [action.payload.formId]: [...existingResponses, action.payload]
        }
      };
    case 'DELETE_RESPONSE':
      return {
        ...state,
        responses: {
          ...state.responses,
          [action.payload.formId]: state.responses[action.payload.formId]?.filter(
            response => response.id !== action.payload.responseId
          ) || []
        }
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

// Definición del contexto
interface FormContextProps extends FormContextState {
  loadForms: () => Promise<void>;
  loadForm: (id: string) => Promise<void>;
  loadResponses: (formId: string) => Promise<void>;
  saveForm: (form: Omit<Form, 'id' | 'createdAt' | 'updatedAt' | 'version'> & { id?: string }) => Promise<string>;
  deleteForm: (id: string) => Promise<void>;
  saveResponse: (response: Omit<FormResponse, 'id' | 'createdAt'>) => Promise<string>;
  deleteResponse: (formId: string, responseId: string) => Promise<void>;
  importForms: (formsData: Form[]) => Promise<void>;
  importResponses: (responsesData: FormResponse[]) => Promise<void>;
  exportForms: () => Promise<Form[]>;
  exportFormResponses: (formId: string) => Promise<FormResponse[]>;
}

const FormContext = createContext<FormContextProps | undefined>(undefined);

// Hook personalizado para usar el contexto
export const useForm = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useForm must be used within a FormProvider');
  }
  return context;
};

// Proveedor del contexto
export const FormProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(formReducer, initialState);
  const { user } = useAuth();
  const { t } = useTranslation();
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost/api';

  // Cargar formularios cuando el usuario cambia
  useEffect(() => {
    if (user) {
      loadForms();
    }
  }, [user]);

  /**
   * Carga todos los formularios desde la API
   */
  const loadForms = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/forms`);
      
      if (!response.ok) {
        throw new Error(t('error_loading_forms'));
      }
      
      const forms = await response.json();
      dispatch({ type: 'SET_FORMS', payload: forms });
    } catch (error: any) {
      console.error('Error loading forms:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_loading_forms'));
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Carga un formulario específico por ID
   */
  const loadForm = async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/forms/${id}`);
      
      if (!response.ok) {
        throw new Error(t('form_not_found'));
      }
      
      const form = await response.json();
      dispatch({ type: 'SET_CURRENT_FORM', payload: form });
    } catch (error: any) {
      console.error('Error loading form:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_loading_form'));
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Carga las respuestas de un formulario específico
   */
  const loadResponses = async (formId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/forms/${formId}/responses`);
      
      if (!response.ok) {
        throw new Error(t('error_loading_responses'));
      }
      
      const responses = await response.json();
      dispatch({ type: 'SET_RESPONSES', payload: { formId, responses } });
    } catch (error: any) {
      console.error('Error loading responses:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_loading_responses'));
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Guarda o actualiza un formulario en la API
   * @param formData - Datos del formulario a guardar
   * @returns Promise con el ID del formulario guardado
   */
  const saveForm = async (
    formData: Omit<Form, 'id' | 'createdAt' | 'updatedAt' | 'version'> & { id?: string }
  ) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Configuración de la petición
      let url = `${API_BASE}/forms`;
      let method = 'POST';
      
      if (formData.id) {
        url += `/${formData.id}`;
        method = 'PUT';
      }
      
      // Validación de datos
      if (!formData.name || !formData.questions) {
        throw new Error(t('form_name_and_questions_required'));
      }
      
      // Prepara el cuerpo de la petición
      const body = {
        name: formData.name,
        description: formData.description || '',
        questions: formData.questions
      };
      
      console.log('Enviando formulario a:', url, 'con método:', method);
      console.log('Datos del formulario:', JSON.stringify(body, null, 2));
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('error_saving_form'));
      }
      
      const savedForm = await response.json();
      
      // Actualiza el estado según si es nuevo o actualización
      if (formData.id) {
        dispatch({ type: 'UPDATE_FORM', payload: savedForm });
      } else {
        dispatch({ type: 'ADD_FORM', payload: savedForm });
      }
      
      dispatch({ type: 'SET_CURRENT_FORM', payload: savedForm });
      toast.success(t('form_saved_successfully'));
      
      return savedForm.id;
    } catch (error: any) {
      console.error('Error saving form:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(error.message || t('error_saving_form'));
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Elimina un formulario de la API
   */
  const deleteForm = async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/forms/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(t('error_deleting_form'));
      }
      
      dispatch({ type: 'DELETE_FORM', payload: id });
      toast.success(t('form_deleted_successfully'));
    } catch (error: any) {
      console.error('Error deleting form:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_deleting_form'));
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Guarda una respuesta de formulario en la API
   */
  const saveResponse = async (responseData: Omit<FormResponse, 'id' | 'createdAt'>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Prepara los datos de la respuesta
      const responseToSave = {
        ...responseData,
        id: uuidv4(),
        createdAt: new Date().toISOString()
      };
      
      console.log('Guardando respuesta:', responseToSave);
      
      const response = await fetch(`${API_BASE}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(responseToSave)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('error_saving_response'));
      }
      
      const savedResponse = await response.json();
      dispatch({ type: 'ADD_RESPONSE', payload: savedResponse });
      toast.success(t('response_saved_successfully'));
      
      return savedResponse.id;
    } catch (error: any) {
      console.error('Error saving response:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(error.message || t('error_saving_response'));
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Elimina una respuesta de formulario de la API
   */
  const deleteResponse = async (formId: string, responseId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/responses/${responseId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(t('error_deleting_response'));
      }
      
      dispatch({ type: 'DELETE_RESPONSE', payload: { formId, responseId } });
      toast.success(t('response_deleted_successfully'));
    } catch (error: any) {
      console.error('Error deleting response:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_deleting_response'));
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Importa múltiples formularios a la API
   */
  const importForms = async (formsData: Form[]) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/forms/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formsData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('error_importing_forms'));
      }
      
      await loadForms();
      toast.success(t('forms_imported_successfully'));
    } catch (error: any) {
      console.error('Error importing forms:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_importing_forms'));
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Importa múltiples respuestas a la API
   */
  const importResponses = async (responsesData: FormResponse[]) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/responses/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(responsesData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('error_importing_responses'));
      }
      
      // Recargar respuestas para los formularios afectados
      const formIds = new Set(responsesData.map(r => r.formId));
      for (const formId of formIds) {
        await loadResponses(formId);
      }
      
      toast.success(t('responses_imported_successfully'));
    } catch (error: any) {
      console.error('Error importing responses:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_importing_responses'));
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Exporta todos los formularios desde la API
   */
  const exportForms = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/forms/export`);
      
      if (!response.ok) {
        throw new Error(t('error_exporting_forms'));
      }
      
      const forms = await response.json();
      toast.success(t('forms_exported_successfully'));
      return forms;
    } catch (error: any) {
      console.error('Error exporting forms:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_exporting_forms'));
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Exporta respuestas de un formulario específico desde la API
   */
  const exportFormResponses = async (formId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/forms/${formId}/responses/export`);
      
      if (!response.ok) {
        throw new Error(t('error_exporting_responses'));
      }
      
      const responses = await response.json();
      toast.success(t('responses_exported_successfully'));
      return responses;
    } catch (error: any) {
      console.error('Error exporting responses:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_exporting_responses'));
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Valor del contexto que se proveerá a los componentes hijos
  const value = {
    ...state,
    loadForms,
    loadForm,
    loadResponses,
    saveForm,
    deleteForm,
    saveResponse,
    deleteResponse,
    importForms,
    importResponses,
    exportForms,
    exportFormResponses
  };

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
};