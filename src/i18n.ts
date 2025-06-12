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
          // English translations
          forms: {
            title: 'Forms',
            create: 'Create Form',
            edit: 'Edit Form',
            preview: 'Preview',
            responses: 'Responses',
            import: 'Import/Export'
          }
        }
      },
      es: {
        translation: {
          // Spanish translations
          forms: {
            title: 'Formularios',
            create: 'Crear Formulario',
            edit: 'Editar Formulario',
            preview: 'Vista Previa',
            responses: 'Respuestas',
            import: 'Importar/Exportar'
          }
        }
      }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;