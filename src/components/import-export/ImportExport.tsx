import React, { useState, useRef } from 'react';
import { useForm } from '../../contexts/FormContext';
import { useTranslation } from 'react-i18next';
import { Upload, Download, FileText, Database, FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '../../utils/excelUtils';
import { readExcelFile, readOfflineResponseFile } from '../../utils/excelUtils';
import Spinner from '../ui/Spinner';
import toast from 'react-hot-toast';

const ImportExport: React.FC = () => {
  const { t } = useTranslation();
  const { 
    forms, 
    exportForms, 
    importForms, 
    importResponses, 
    loadForms, 
    isLoading 
  } = useForm();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const responsesFileInputRef = useRef<HTMLInputElement>(null);
  const offlineResponsesFileInputRef = useRef<HTMLInputElement>(null);
  
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Exportar todos los formularios
  const handleExportForms = async () => {
    try {
      setExportLoading(true);
      const formsData = await exportForms();
      await exportToExcel(formsData, 'formularios_exportados.xlsx');
      toast.success(t('export_success'));
    } catch (error) {
      console.error('Error exporting forms:', error);
      toast.error('Error al exportar los formularios');
    } finally {
      setExportLoading(false);
    }
  };
  
  // Importar formularios desde un archivo Excel
  const handleImportForms = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      setImportLoading(true);
      const data = await readExcelFile(file, 'forms');
      
      if (Array.isArray(data) && data.length > 0) {
        await importForms(data);
        await loadForms(); // Recargar formularios
        toast.success(t('import_success'));
      } else {
        toast.error('El archivo no contiene datos válidos');
      }
    } catch (error) {
      console.error('Error importing forms:', error);
      toast.error('Error al importar los formularios');
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Importar respuestas desde un archivo Excel
  const handleImportResponses = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      setImportLoading(true);
      const data = await readExcelFile(file, 'responses');
      
      if (Array.isArray(data) && data.length > 0) {
        await importResponses(data);
        toast.success(t('import_success'));
      } else {
        toast.error('El archivo no contiene datos válidos');
      }
    } catch (error) {
      console.error('Error importing responses:', error);
      toast.error('Error al importar las respuestas');
    } finally {
      setImportLoading(false);
      if (responsesFileInputRef.current) {
        responsesFileInputRef.current.value = '';
      }
    }
  };

  // Importar respuestas desde formularios offline
  const handleImportOfflineResponses = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      setImportLoading(true);
      const data = await readOfflineResponseFile(file, forms);
      
      if (Array.isArray(data) && data.length > 0) {
        await importResponses(data);
        toast.success(`${data.length} respuesta(s) importada(s) correctamente`);
      } else {
        toast.error('El archivo no contiene respuestas válidas');
      }
    } catch (error) {
      console.error('Error importing offline responses:', error);
      toast.error('Error al importar las respuestas offline: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setImportLoading(false);
      if (offlineResponsesFileInputRef.current) {
        offlineResponsesFileInputRef.current.value = '';
      }
    }
  };
  
  return (
    <div className="container mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Exportar Formularios */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Download className="text-blue-600 mr-2" size={24} />
            <h2 className="text-xl font-bold text-gray-800">{t('export_forms')}</h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            Exporta todos tus formularios para compartirlos o hacer una copia de seguridad.
          </p>
          
          <button
            type="button"
            onClick={handleExportForms}
            disabled={exportLoading || forms.length === 0}
            className={`w-full py-3 rounded-md flex items-center justify-center ${
              forms.length === 0
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : 'bg-blue-600 text-white hover:bg-blue-700 transition-colors'
            }`}
          >
            {exportLoading ? (
              <Spinner size="sm" color="white" />
            ) : (
              <>
                <Download size={16} className="mr-2" /> 
                Exportar {forms.length} formulario{forms.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
          
          {forms.length === 0 && (
            <p className="text-sm text-center mt-2 text-gray-500">
              No hay formularios para exportar
            </p>
          )}
        </div>
        
        {/* Importar Formularios */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Upload className="text-green-600 mr-2" size={24} />
            <h2 className="text-xl font-bold text-gray-800">{t('import_forms')}</h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            Importa formularios desde un archivo Excel previamente exportado.
          </p>
          
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors ${
              importLoading ? 'opacity-50 cursor-not-allowed' : 'border-green-300'
            }`}
            onClick={() => !importLoading && fileInputRef.current?.click()}
          >
            {importLoading ? (
              <Spinner />
            ) : (
              <>
                <div className="flex justify-center mb-3">
                  <FileText size={36} className="text-green-500" />
                </div>
                <p className="text-gray-600">{t('drag_drop')}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Solo archivos Excel (.xlsx)
                </p>
              </>
            )}
            
            <input 
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx"
              onChange={handleImportForms}
              disabled={importLoading}
            />
          </div>
        </div>
        
        {/* Importar Respuestas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Database className="text-purple-600 mr-2" size={24} />
            <h2 className="text-xl font-bold text-gray-800">{t('import_responses')}</h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            Importa respuestas desde formularios que fueron completados sin conexión.
          </p>
          
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors ${
              importLoading ? 'opacity-50 cursor-not-allowed' : 'border-purple-300'
            }`}
            onClick={() => !importLoading && responsesFileInputRef.current?.click()}
          >
            {importLoading ? (
              <Spinner />
            ) : (
              <>
                <div className="flex justify-center mb-3">
                  <Database size={36} className="text-purple-500" />
                </div>
                <p className="text-gray-600">Arrastra y suelta archivos de respuestas o haz clic para seleccionar</p>
                <p className="text-sm text-gray-500 mt-2">
                  Solo archivos Excel (.xlsx) con formato de respuestas
                </p>
              </>
            )}
            
            <input 
              type="file"
              ref={responsesFileInputRef}
              className="hidden"
              accept=".xlsx"
              onChange={handleImportResponses}
              disabled={importLoading}
            />
          </div>
        </div>

        {/* Importar Respuestas Offline */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <FileSpreadsheet className="text-orange-600 mr-2" size={24} />
            <h2 className="text-xl font-bold text-gray-800">Importar Respuestas Offline</h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            Importa respuestas desde archivos Excel generados por formularios offline.
          </p>
          
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors ${
              importLoading ? 'opacity-50 cursor-not-allowed' : 'border-orange-300'
            }`}
            onClick={() => !importLoading && offlineResponsesFileInputRef.current?.click()}
          >
            {importLoading ? (
              <Spinner />
            ) : (
              <>
                <div className="flex justify-center mb-3">
                  <FileSpreadsheet size={36} className="text-orange-500" />
                </div>
                <p className="text-gray-600">Arrastra y suelta archivos de respuestas offline o haz clic para seleccionar</p>
                <p className="text-sm text-gray-500 mt-2">
                  Archivos Excel (.xlsx) generados por formularios offline
                </p>
              </>
            )}
            
            <input 
              type="file"
              ref={offlineResponsesFileInputRef}
              className="hidden"
              accept=".xlsx"
              onChange={handleImportOfflineResponses}
              disabled={importLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportExport;
