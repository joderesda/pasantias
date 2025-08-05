import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from '../contexts/FormContext';
// Removed unused translation hook for now
import { toast } from 'react-hot-toast';
import Spinner from '../components/ui/Spinner';
import FormFieldRenderer from '../components/forms/FormFieldRenderer';
import { Question } from '../types';

const TestQRPage: React.FC = () => {
  // For testing, you can hardcode a form ID or get it from URL params
  const { formId = 'YOUR_TEST_FORM_ID' } = useParams<{ formId?: string }>();
  const { loadForm, saveResponse } = useForm();
  const [form, setForm] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<Record<string, any>>({});
  // Translation hook removed for now
  const navigate = useNavigate();

  useEffect(() => {
    const fetchForm = async () => {
      if (!formId) return;
      
      try {
        setIsLoading(true);
        const formData = await loadForm(formId);
        
        if (formData && typeof formData === 'object' && 'questions' in formData) {
          setForm(formData);
          
          // Initialize form data with empty values
          const initialData: Record<string, any> = {};
          formData.questions?.forEach((question: Question) => {
            initialData[question.id] = question.type === 'multiselect' ? [] : '';
          });
          setFormData(initialData);
        } else {
          throw new Error('Form not found');
        }
      } catch (error) {
        console.error('Error loading form:', error);
        toast.error('Error loading form. Please check the form ID.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchForm();
  }, [formId, loadForm]);

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
      const responseData = {
        formId,
        formVersion: form.version || 1,
        responses: Object.entries(formData).map(([questionId, value]) => ({
          questionId,
          value
        })),
        userId: 'anonymous',
        username: 'Anonymous User',
        updatedOffline: false,
      };
      
      await saveResponse(responseData, undefined);
      
      toast.success('Response submitted successfully!');
      navigate('/gracias');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Error submitting form. Please try again.');
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
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Form Not Found</h1>
          <p className="text-gray-600">The form you're looking for doesn't exist or is no longer available.</p>
          <button 
            onClick={() => navigate('/')} 
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Back to Home
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
                  />
                ))}
                
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Submit Form
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Powered by ODEC</p>
        </div>
      </div>
    </div>
  );
};

export default TestQRPage;
