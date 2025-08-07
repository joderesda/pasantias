import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

import { Form, FormResponse, FormContextState, User } from '../types';
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
  let questions = [];
  if (typeof backendForm.questions === 'string') {
    try {
      questions = JSON.parse(backendForm.questions);
    } catch (error) {
      console.error(`Error parsing questions JSON for form ${backendForm.id}:`, error);
      throw new Error('The form data is corrupt and cannot be displayed.');
    }
  } else if (Array.isArray(backendForm.questions)) {
    questions = backendForm.questions;
  }

  return {
    id: backendForm.id,
    name: backendForm.name,
    description: backendForm.description || '',
    questions: questions,
    createdAt: new Date(backendForm.createdAt || backendForm.created_at).getTime(),
    updatedAt: new Date(backendForm.updatedAt || backendForm.updated_at).getTime(),
    version: parseInt(backendForm.version) || 1
  };
};

// Función para convertir respuestas del backend al formato del frontend
const transformResponseFromBackend = (backendResponse: any): FormResponse => {
  return {
    id: backendResponse.id,
    formId: backendResponse.formId || backendResponse.formId,
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
interface FormContextProps extends Omit<FormContextState, 'responses'> {
  user: User | null;
  loadForms: () => Promise<void>;
  loadForm: (id: string, isPublic?: boolean) => Promise<Form>;
  loadResponses: (formId: string) => Promise<void>;
  saveForm: (form: Omit<Form, 'id' | 'createdAt' | 'updatedAt' | 'version'> & { id?: string }) => Promise<string>;
  deleteForm: (id: string) => Promise<void>;
  saveResponse: (response: Omit<FormResponse, 'id' | 'createdAt'>, responseId?: string) => Promise<string>;
  deleteResponse: (formId: string, responseId: string) => Promise<void>;
  importForms: (formsData: Form[]) => Promise<void>;
  importResponses: (importData: { formId: string, responses: any[] }) => Promise<void>;
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
  const loadForm = useCallback(async (id: string, isPublic: boolean = false) => {
    console.log('Iniciando carga de formulario:', { id, isPublic });
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const options: RequestInit = {
        // No incluir credenciales para peticiones públicas
        credentials: isPublic ? 'omit' : 'include'
      };
      
      const url = `${API_BASE}/forms/${id}`;
      console.log('URL de la petición:', url);
      
      const response = await fetch(url, options);
      console.log('Respuesta del servidor:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        // Si es un error 401 y es una petición pública, lanzar error específico
        if (response.status === 401) {
          console.log('Error 401 - No autorizado');
          if (isPublic) {
            throw new Error(t('form_requires_authentication'));
          } else {
            // Si no es pública y da 401, redirigir al login
            console.log('Redirigiendo a login...');
            window.location.href = '/login';
            return Promise.reject(new Error('Unauthorized'));
          }
        }
        console.error('Error en la respuesta:', await response.text().catch(() => 'No se pudo leer el cuerpo de la respuesta'));
        throw new Error(t('form_not_found'));
      }
      
      const backendForm = await response.json().catch(error => {
        console.error('Error al parsear la respuesta JSON:', error);
        throw new Error(t('error_parsing_response'));
      });
      
      console.log('Datos del formulario recibidos:', backendForm);
      
      if (!backendForm) {
        console.error('La respuesta del servidor está vacía');
        throw new Error(t('form_not_found'));
      }
      
      const transformedForm = transformFormFromBackend(backendForm);
      console.log('Formulario transformado:', transformedForm);
      
      // Solo actualizar el estado del formulario actual si el ID coincide
      if (transformedForm.id === id) {
        console.log('Actualizando formulario actual en el estado');
        dispatch({ type: 'SET_CURRENT_FORM', payload: transformedForm });
      } else {
        console.warn('El ID del formulario transformado no coincide con el solicitado', {
          requestedId: id,
          receivedId: transformedForm.id
        });
      }
      
      return transformedForm; // Devolver el formulario cargado
    } catch (error: any) {
      console.error('Error en loadForm:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        isPublic
      });
      
      // No mostrar error de "formulario no encontrado" para peticiones públicas
      // para evitar revelar información sobre formularios que podrían existir
      if (!isPublic || error.message !== t('form_requires_authentication')) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        toast.error(error.message || t('error_loading_form'));
      }
      throw error; // Relanzar el error para manejarlo en el componente
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
      
      // Transforma los datos al formato esperado por el backend
      const requestData = {
        formId: response.formId,
        formVersion: response.formVersion,
        responses: response.responses,
        updatedOffline: response.updatedOffline,
        userId: response.userId || user?.id || 'anonymous',
        username: response.username || user?.username || 'Anonymous User'
      };
      
      console.log('Guardando respuesta:', requestData);
      
      let url = `${API_BASE}/responses`;
      let method = 'POST';
      
      // Si hay responseId, es una actualización
      if (responseId) {
        url += `/${responseId}`;
        method = 'PUT';
      }
      
      console.log('Enviando solicitud a:', url);
      console.log('Método:', method);
      
      const fetchResponse = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });
      
      console.log('Respuesta del servidor:', {
        status: fetchResponse.status,
        statusText: fetchResponse.statusText,
        headers: Object.fromEntries(fetchResponse.headers.entries())
      });
      
      const responseBody = await fetchResponse.text();
      console.log('Cuerpo de la respuesta:', responseBody);
      
      if (!fetchResponse.ok) {
        let errorMessage = 'Error desconocido';
        try {
          const errorData = responseBody ? JSON.parse(responseBody) : {};
          errorMessage = errorData.message || errorData.error || t('error_saving_response');
        } catch (e) {
          errorMessage = responseBody || t('error_saving_response');
        }
        throw new Error(errorMessage);
      }
      
      const result = responseBody ? JSON.parse(responseBody) : {};
      
      // Actualiza el estado local
      const savedResponse = transformResponseFromBackend(result.response || result);
      
      console.log('Respuesta guardada exitosamente:', savedResponse);
      if (responseId) {
        dispatch({ type: 'UPDATE_RESPONSE', payload: savedResponse });
      } else {
        dispatch({ type: 'ADD_RESPONSE', payload: savedResponse });
      }

      toast.success(t('response_saved_successfully'));
      
      return savedResponse.id || '';
    } catch (error: any) {
      console.error('Error saving response:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(error.message || t('error_saving_response'));
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [t, dispatch]);

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
  const importResponses = useCallback(async (importData: { formId: string, responses: any[] }) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      console.log('🧠 Iniciando importación con datos:', importData);
      
      // 1. Validación estricta de entrada
      if (!importData || typeof importData !== 'object') {
        throw new Error('Import data must be an object');
      }

      if (!importData.formId || typeof importData.formId !== 'string') {
        throw new Error('formId is required and must be a string');
      }

      if (!Array.isArray(importData.responses)) {
        throw new Error('responses must be an array');
      }

      if (importData.responses.length === 0) {
        throw new Error('responses array cannot be empty');
      }

      console.log('✅ Validación inicial pasada');
      console.log('📤 Enviando datos EXACTOS al backend PHP:', JSON.stringify(importData, null, 2));

      // 2. Enviar al backend exactamente como está
      const response = await fetch(`${API_BASE}/responses/import`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(importData)
      });

      console.log('📡 Respuesta del servidor:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error del servidor:', errorText);
        
        let errorMessage = 'Server error during import';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Resultado del servidor:', result);

      // 3. Actualizar estado local
      await loadResponses(importData.formId);

      toast.success(`Respuestas importadas correctamente`);
      
    } catch (error: any) {
      console.error('❌ Error en importación:', error);
      toast.error(error.message || t('error_importing_responses'));
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [t, loadResponses, user]);

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
    exportFormResponses,
    user
  };

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
};