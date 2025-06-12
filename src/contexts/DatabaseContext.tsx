import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface Form {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  [key: string]: any;
}

interface ResponseData {
  id: string;
  formId: string;
  data: any;
  submittedAt: string;
  userId?: string;
}

interface DatabaseContextType {
  forms: Form[];
  responses: ResponseData[];
  users: User[];
  isLoading: boolean;
  error: string | null;
  fetchForms: () => Promise<void>;
  fetchFormById: (id: string) => Promise<Form | null>;
  fetchResponses: (formId?: string) => Promise<void>;
  fetchUsers: () => Promise<void>;
  createForm: (form: Omit<Form, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => Promise<Form>;
  updateForm: (id: string, form: Partial<Form>) => Promise<Form>;
  deleteForm: (id: string) => Promise<void>;
  createResponse: (response: Omit<ResponseData, 'id' | 'submittedAt'>) => Promise<ResponseData>;
  deleteResponse: (id: string) => Promise<void>;
  createUser: (user: Omit<User, 'id'>) => Promise<User>;
  updateUser: (id: string, user: Partial<User>) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [forms, setForms] = useState<Form[]>([]);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  
  const API_BASE = import.meta.env.VITE_REACT_APP_API_BASE || 'http://localhost/api';
  const { user } = useAuth();

  const getAuthHeader = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const handleError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    setError(message);
    toast.error(message);
    throw error;
  };

  /**
   * Form Operations
   */
  const fetchForms = async () => {
    console.log("Usuario antes", user);
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/forms`, {
        headers: getAuthHeader()
      });
      console.log("Usuario:", user);
      console.log("Token:", localStorage.getItem('auth_token'));
      if (!response.ok) {
        throw new Error('Failed to fetch forms');
      }
      
      const data = await response.json();
      setForms(data);
      setError(null);
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFormById = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/forms/${id}`, {
        headers: getAuthHeader()
      });
      
      if (!response.ok) {
        throw new Error('Form not found');
      }
      
      const data = await response.json();
      setError(null);
      return data;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const createForm = async (form: Omit<Form, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/forms`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(form)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create form');
      }
      
      const newForm = await response.json();
      setForms(prev => [...prev, newForm]);
      toast.success(t('form_created'));
      return newForm;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateForm = async (id: string, form: Partial<Form>) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/forms/${id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(form)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update form');
      }
      
      const updatedForm = await response.json();
      setForms(prev => prev.map(f => f.id === id ? updatedForm : f));
      toast.success(t('form_updated'));
      return updatedForm;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteForm = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/forms/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete form');
      }
      
      setForms(prev => prev.filter(f => f.id !== id));
      toast.success(t('form_deleted'));
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Response Operations
   */
  const fetchResponses = async (formId?: string) => {
    setIsLoading(true);
    try {
      const url = formId ? `${API_BASE}/forms/${formId}/responses` : `${API_BASE}/responses`;
      const response = await fetch(url, {
        headers: getAuthHeader()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch responses');
      }
      
      const data = await response.json();
      setResponses(data);
      setError(null);
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const createResponse = async (response: Omit<ResponseData, 'id' | 'submittedAt'>) => {
    setIsLoading(true);
    try {
      const responseToSend = {
        ...response,
        userId: user?.id
      };
      
      const apiResponse = await fetch(`${API_BASE}/responses`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(responseToSend)
      });
      
      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.message || 'Failed to create response');
      }
      
      const newResponse = await apiResponse.json();
      setResponses(prev => [...prev, newResponse]);
      toast.success(t('response_submitted'));
      return newResponse;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteResponse = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/responses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete response');
      }
      
      setResponses(prev => prev.filter(r => r.id !== id));
      toast.success(t('response_deleted'));
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (user) {
      fetchForms();
    }
  }, [user]);

  return (
    <DatabaseContext.Provider
      value={{
        forms,
        responses,
        users,
        isLoading,
        error,
        fetchForms,
        fetchFormById,
        fetchResponses,
        createForm,
        updateForm,
        deleteForm,
        createResponse,
        deleteResponse
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};