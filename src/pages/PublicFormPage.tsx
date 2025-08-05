import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from '../contexts/FormContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import Spinner from '../components/ui/Spinner';
import FormFieldRenderer from '../components/forms/FormFieldRenderer';
import { Form, FormResponse, Question } from '../types';

const PublicFormPage: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const { loadForm, saveResponse } = useForm();
  const [form, setForm] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchForm = async () => {
      if (!formId) return;
      
      try {
        setIsLoading(true);
        const formData = await loadForm(formId);
        
        if (formData && 'questions' in formData) {
          setForm(formData);
          
          // Initialize form data with empty values
          const initialData: Record<string, any> = {};
          formData.questions?.forEach((question: Question) => {
            initialData[question.id] = question.type === 'checkbox' ? [] : '';
          });
          setFormData(initialData);
        } else {
          throw new Error('Form not found');
        }
      } catch (error) {
        console.error('Error loading form:', error);
        toast.error(t('error_loading_form'));
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchForm();
  }, [formId, loadForm, navigate, t]);

  const handleChange = (questionId: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form || !formId) return;
    
    try {
      setIsSubmitting(true);
      
      // Prepare response data
      const responseData: Omit<FormResponse, 'id' | 'createdAt'> = {
        formId,
        formVersion: form.version || 1,
        responses: Object.entries(formData).map(([questionId, value]) => ({
          questionId,
          value
        })),
        userId: 'anonymous',
        username: 'Anonymous User',
        updatedOffline: false,
        // Add any other required fields from FormResponse type
      };
      
      // Save response
      await saveResponse(responseData, undefined);
      
      // Show success message
      toast.success(t('response_submitted') || 'Response submitted successfully');
      
      // Redirect to thank you page or home
      navigate('/gracias');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(t('error_submitting_form') || 'Error submitting form');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{form.name}</h1>
            {form.description && (
              <p className="text-gray-600 mb-6">{form.description}</p>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {form.questions?.map((question: Question) => (
                  <FormFieldRenderer
                    key={question.id}
                    question={question}
                    value={formData[question.id]}
                    onChange={(value) => handleChange(question.id, value)}
                    disabled={isSubmitting}
                  />
                ))}
                
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (t('submitting') || 'Submitting...') : (t('submit_form') || 'Submit')}
                  </button>
                </div>
              </div>
            </form>
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
