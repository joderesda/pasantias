import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from '../contexts/FormContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import Spinner from '../components/ui/Spinner';
import FormPreview from '../components/forms/FormPreview';
import { Form } from '../types';

const PublicFormPage: React.FC = () => {
  const { formId, responseId } = useParams<{ formId: string; responseId?: string }>();
  const { loadForm } = useForm();
  const [form, setForm] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchForm = async () => {
      if (!formId) {
        console.log('No se proporcionó un ID de formulario');
        navigate('/');
        return;
      }
      
      try {
        console.log('Cargando formulario público:', formId);
        setIsLoading(true);
        
        // Forzar el parámetro isPublic a true explícitamente
        const formData = await loadForm(formId, true);
        console.log('Formulario cargado:', formData ? 'éxito' : 'vacío');
        
        if (formData && 'questions' in formData) {
          setForm(formData);
        } else {
          console.error('Formulario no tiene preguntas o no es válido');
          throw new Error(t('form_not_found') || 'Formulario no encontrado');
        }
      } catch (error: any) {
        console.error('Error al cargar el formulario:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        
        // Mostrar mensaje de error solo si no es un error de autenticación
        if (error.message !== t('form_requires_authentication')) {
          toast.error(error.message || t('error_loading_form') || 'Error al cargar el formulario');
        }
        
        // No redirigir automáticamente, mostrar el error en la página
        setForm(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchForm();
    
    // Limpiar al desmontar
    return () => {
      setForm(null);
    };
  }, [formId, loadForm, t]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!form || !('questions' in form)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">{t('form_not_found')}</h1>
          <p className="text-gray-600">{t('form_not_available')}</p>
          <button 
            onClick={() => navigate('/')} 
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            {t('back_to_home') || 'Back to Home'}
          </button>
        </div>
      </div>
    );
  }

  if (!formId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">{t('form_not_found')}</h1>
          <button 
            onClick={() => navigate('/')} 
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            {t('back_to_home') || 'Back to Home'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{form.name}</h1>
            {form.description && (
              <p className="text-gray-600 mb-6">{form.description}</p>
            )}
            
            <div key={formId} className="w-full">
              <FormPreview formId={formId} />
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>{t('form_powered_by')} ODEC</p>
        </div>
      </div>
    </div>
  );
};

export default PublicFormPage;
