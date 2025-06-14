import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
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
  | { type: 'UPDATE_RESPONSE'; payload: FormResponse }
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

// Función para convertir datos del backend al formato del frontend
const transformFormFromBackend = (backendForm: any): Form => {
  return {
    id: backendForm.id,
    name: backendForm.name,
    description: backendForm.description || '',
    questions: Array.isArray(backendForm.questions) ? backendForm.questions : [],
    createdAt: new Date(backendForm.createdAt || backendForm.created_at).getTime(),
    updatedAt: new Date(backendForm.updatedAt || backendForm.updated_at).getTime(),
    version: parseInt(backendForm.version) || 1
  };
};

// Función para convertir respuestas del backend al formato del frontend
const transformResponseFromBackend = (backendResponse: any): FormResponse => {
  return {
    id: backendResponse.id,
    formId: backendResponse.form_id || backendResponse.formId,
    formVersion: parseInt(backendResponse.form_version || backendResponse.formVersion) || 1,
    responses: Array.isArray(backendResponse.responses) ? backendResponse.responses : [],
    createdAt: new Date(backendResponse.created_at || backendResponse.createdAt).getTime(),
    updatedOffline: Boolean(backendResponse.updated_offline || backendResponse.updatedOffline),
    userId: backendResponse.user_id || backendResponse.userId || '',
    username: backendResponse.username || 'Usuario Anónimo'
  };
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
    case 'UPDATE_RESPONSE':
      const formResponses = state.responses[action.payload.formId] || [];
      return {
        ...state,
        responses: {
          ...state.responses,
          [action.payload.formId]: formResponses.map(response => 
            response.id === action.payload.id ? action.payload : response
          )
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
  saveResponse: (response: Omit<FormResponse, 'id' | 'createdAt'>, responseId?: string) => Promise<string>;
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
  const API_BASE = '/api';

  /**
   * Carga todos los formularios desde la API
   */
  const loadForms = useCallback(async () => {
    try {
      console.log('Iniciando carga de formularios...');
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/forms`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(t('error_loading_forms'));
      }
      
      const backendForms = await response.json();
      console.log('Datos recibidos del backend:', backendForms);
      
      // Transformar los datos del backend al formato del frontend
      const transformedForms = Array.isArray(backendForms) 
        ? backendForms.map(transformFormFromBackend)
        : [];
      
      console.log('Formularios procesados:', transformedForms);
      
      dispatch({ type: 'SET_FORMS', payload: transformedForms });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error: any) {
      console.error('Error loading forms:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_loading_forms'));
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [t]);

  /**
   * Carga un formulario específico por ID
   */
  const loadForm = useCallback(async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/forms/${id}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(t('form_not_found'));
      }
      
      const backendForm = await response.json();
      const transformedForm = transformFormFromBackend(backendForm);
      
      dispatch({ type: 'SET_CURRENT_FORM', payload: transformedForm });
    } catch (error: any) {
      console.error('Error loading form:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_loading_form'));
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [t]);

  /**
   * Carga las respuestas de un formulario específico
   */
  const loadResponses = useCallback(async (formId: string) => {
    try {
      const response = await fetch(`${API_BASE}/forms/${formId}/responses`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(t('error_loading_responses'));
      }
      
      const backendResponses = await response.json();
      console.log('Respuestas del backend:', backendResponses);
      
      // Transformar respuestas del backend
      const transformedResponses = Array.isArray(backendResponses) 
        ? backendResponses.map(transformResponseFromBackend)
        : [];
      
      console.log('Respuestas transformadas:', transformedResponses);
      
      dispatch({ type: 'SET_RESPONSES', payload: { formId, responses: transformedResponses } });
    } catch (error: any) {
      console.error('Error loading responses:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(t('error_loading_responses'));
    }
  }, [t]);

  /**
   * Guarda o actualiza un formulario en la API
   * @param formData - Datos del formulario a guardar
   * @returns Promise con el ID del formulario guardado
   */
  const saveForm = useCallback(async (
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
        ...(formData.id && { id: formData.id }), // Incluir ID solo si existe
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
        credentials: 'include',
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('error_saving_form'));
      }
      
      const backendForm = await response.json();
      const savedForm = transformFormFromBackend(backendForm);
      
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
  }, [t]);

  /**
   * Elimina un formulario de la API
   */
  const deleteForm = useCallback(async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/forms/${id}`, {
        method: 'DELETE',
        credentials: 'include'
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
  }, [t]);

  /**
   * Guarda una respuesta de formulario en la API
   * Modificado para manejar actualizaciones de respuestas existentes
   */
  const saveResponse = useCallback(async (
    responseData: Omit<FormResponse, 'id' | 'createdAt'>, 
    responseId?: string
  ) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Prepara los datos de la respuesta
      const responseToSave = {
        formId: responseData.formId,
        formVersion: responseData.formVersion,
        responses: responseData.responses,
        updatedOffline: responseData.updatedOffline || false
      };
      
      console.log('Guardando respuesta:', responseToSave);
      
      let url = `${API_BASE}/responses`;
      let method = 'POST';
      
      // Si hay responseId, es una actualización
      if (responseId) {
        url += `/${responseId}`;
        method = 'PUT';
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(responseToSave)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('error_saving_response'));
      }
      
      const result = await response.json();
      
      // Reload responses for this form
      await loadResponses(responseData.formId);
      
      toast.success(t('response_saved_successfully'));
      
      return result.id || responseId || '';
    } catch (error: any) {
      console.error('Error saving response:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(error.message || t('error_saving_response'));
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [t, loadResponses]);

  /**
   * Elimina una respuesta de formulario de la API
   */
  const deleteResponse = useCallback(async (formId: string, responseId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/responses/${responseId}`, {
        method: 'DELETE',
        credentials: 'include'
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
  }, [t]);

  /**
   * Importa múltiples formularios a la API
   */
  const importForms = useCallback(async (formsData: Form[]) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/forms/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
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
  }, [t, loadForms]);

  /**
   * Importa múltiples respuestas a la API - CORREGIDO PARA BACKEND PHP
   */
  const importResponses = useCallback(async (responsesData: FormResponse[]) => {
  try {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    console.log('Importando respuestas:', responsesData);
    
    // Validar que todas las respuestas tengan formId y responses
    const validResponses = responsesData.filter(response => {
      const isValid = response.formId && response.responses && response.responses.length > 0;
      if (!isValid) {
        console.warn('Respuesta inválida:', response);
      }
      return isValid;
    });
    
    if (validResponses.length === 0) {
      throw new Error('No hay respuestas válidas para importar');
    }
    
    console.log('Respuestas válidas para importar:', validResponses);
    
    // Convertir al formato que espera el backend PHP
    const backendResponses = validResponses.map(response => ({
      formId: response.formId,
      formVersion: response.formVersion,
      responses: response.responses,
      createdAt: response.createdAt,
      updatedOffline: response.updatedOffline
    }));
    
    // Enviar respuestas una por una
    for (const responseObj of backendResponses) {
      console.log('Enviando respuesta:', responseObj);
      
      const response = await fetch(`${API_BASE}/responses/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(responseObj)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error en respuesta individual:', errorData);
        throw new Error(errorData.message || t('error_importing_responses'));
      }
    }
    
    // Recargar respuestas para los formularios afectados
    const formIds = new Set(validResponses.map(r => r.formId));
    for (const formId of formIds) {
      await loadResponses(formId);
    }
    
    toast.success(t('responses_imported_successfully'));
  } catch (error: any) {
    console.error('Error importing responses:', error);
    dispatch({ type: 'SET_ERROR', payload: error.message });
    toast.error(t('error_importing_responses'));
    throw error;
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false });
  }
}, [t, loadResponses]);

  /**
   * Exporta todos los formularios desde la API
   */
  const exportForms = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/forms/export`, {
        credentials: 'include'
      });
      
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
  }, [t]);

  /**
   * Exporta respuestas de un formulario específico desde la API
   */
  const exportFormResponses = useCallback(async (formId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`${API_BASE}/forms/${formId}/responses/export`, {
        credentials: 'include'
      });
      
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
  }, [t]);

  // Cargar formularios cuando el usuario cambia (solo una vez)
  useEffect(() => {
    if (user) {
      console.log('User authenticated, loading forms...');
      loadForms();
    }
  }, [user, loadForms]);

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
