import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          // App branding
          app_title: 'Observatory of Coexistence and Citizen Security of Magdalena',
          
          // Navigation
          forms: 'Forms',
          create_form: 'Create Form',
          import_export: 'Import/Export',
          
          // Forms
          form_name: 'Form Name',
          form_description: 'Form Description',
          questions: 'Questions',
          responses: 'Responses',
          version: 'Version',
          actions: 'Actions',
          
          // Actions
          edit: 'Edit',
          delete: 'Delete',
          preview: 'Preview',
          view_responses: 'View Responses',
          export_form: 'Export Form',
          
          // Messages
          no_forms_created: 'No forms have been created yet',
          no_matching_forms: 'No forms match your search',
          no_responses: 'No responses yet',
          
          // Buttons
          save: 'Save',
          cancel: 'Cancel',
          confirm_delete: 'Confirm Delete',
          delete_form_warning: 'Are you sure you want to delete this form? This action cannot be undone.',
          
          // Search
          search_forms: 'Search forms...',
          
          // Export/Import
          export_success: 'Export completed successfully',
          import_success: 'Import completed successfully',
          drag_drop: 'Drag and drop files here or click to select',
          
          // Errors
          error_loading_forms: 'Error loading forms',
          error_loading_form: 'Error loading form',
          error_loading_responses: 'Error loading responses',
          error_saving_form: 'Error saving form',
          error_deleting_form: 'Error deleting form',
          error_saving_response: 'Error saving response',
          error_deleting_response: 'Error deleting response',
          form_not_found: 'Form not found',
          form_name_and_questions_required: 'Form name and questions are required',
          
          // Success messages
          form_saved_successfully: 'Form saved successfully',
          form_deleted_successfully: 'Form deleted successfully',
          response_saved_successfully: 'Response saved successfully',
          response_deleted_successfully: 'Response deleted successfully'
        }
      },
      es: {
        translation: {
          // App branding
          app_title: 'Observatorio de Convivencia y Seguridad Ciudadana del Magdalena',
          
          // Navigation
          forms: 'Formularios',
          create_form: 'Crear Formulario',
          import_export: 'Importar/Exportar',
          
          // Forms
          form_name: 'Nombre del Formulario',
          form_description: 'Descripción del Formulario',
          questions: 'Preguntas',
          responses: 'Respuestas',
          version: 'Versión',
          actions: 'Acciones',
          name: 'Nombre',
          description: 'Descripción',
          
          // Actions
          edit: 'Editar',
          delete: 'Eliminar',
          preview: 'Vista Previa',
          view_responses: 'Ver Respuestas',
          export_form: 'Exportar Formulario',
          
          // Messages
          no_forms_created: 'No se han creado formularios aún',
          no_matching_forms: 'No hay formularios que coincidan con tu búsqueda',
          no_responses: 'No hay respuestas aún',
          
          // Buttons
          save: 'Guardar',
          cancel: 'Cancelar',
          confirm_delete: 'Confirmar Eliminación',
          delete_form_warning: '¿Está seguro que desea eliminar este formulario? Esta acción no se puede deshacer.',
          
          // Search
          search_forms: 'Buscar formularios...',
          
          // Export/Import
          export_success: 'Exportación completada exitosamente',
          import_success: 'Importación completada exitosamente',
          drag_drop: 'Arrastra y suelta archivos aquí o haz clic para seleccionar',
          
          // Errors
          error_loading_forms: 'Error al cargar formularios',
          error_loading_form: 'Error al cargar formulario',
          error_loading_responses: 'Error al cargar respuestas',
          error_saving_form: 'Error al guardar formulario',
          error_deleting_form: 'Error al eliminar formulario',
          error_saving_response: 'Error al guardar respuesta',
          error_deleting_response: 'Error al eliminar respuesta',
          form_not_found: 'Formulario no encontrado',
          form_name_and_questions_required: 'El nombre del formulario y las preguntas son requeridos',
          
          // Success messages
          form_saved_successfully: 'Formulario guardado exitosamente',
          form_deleted_successfully: 'Formulario eliminado exitosamente',
          response_saved_successfully: 'Respuesta guardada exitosamente',
          response_deleted_successfully: 'Respuesta eliminada exitosamente'
        }
      }
    },
    fallbackLng: 'es',
    lng: 'es', // Set Spanish as default
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;