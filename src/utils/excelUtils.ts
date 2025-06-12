import * as XLSX from 'xlsx';
import { Form, FormResponse, Question } from '../types';

// Función para exportar datos a Excel
export const exportToExcel = async (
  data: any, 
  filename: string, 
  form?: Form
) => {
  // Importar xlsx dinámicamente
  const XLSX = await import('xlsx');
  
  // Si estamos exportando respuestas de un formulario
  if (form && Array.isArray(data)) {
    // Crear una matriz para los datos
    const worksheetData: any[][] = [];
    
    // Crear la fila de encabezados
    const headers = ['Fecha'];
    const questionMap = new Map<string, Question>();
    
    // Agregar solo las preguntas principales
    form.questions.forEach(question => {
      if (!question.parentId) {
        headers.push(question.text);
        questionMap.set(question.id, question);
      }
    });
    
    worksheetData.push(headers);
    
    // Procesar cada respuesta
    data.forEach((response: FormResponse) => {
      const row: any[] = [new Date(response.createdAt)];
      
      // Para cada pregunta principal
      form.questions
        .filter(q => !q.parentId)
        .forEach(question => {
          // Buscar la respuesta para esta pregunta
          const questionResponse = response.responses.find(r => r.questionId === question.id);
          let value = '';
          
          if (questionResponse) {
            if (question.type === 'select' && question.options) {
              // Para preguntas de selección única, mostrar el texto de la opción
              const option = question.options.find(o => o.id === questionResponse.value);
              value = option ? option.text : '';
            } else if (question.type === 'multiselect' && question.options) {
              // Para preguntas de selección múltiple
              if (Array.isArray(questionResponse.value)) {
                value = question.options
                  .filter(o => questionResponse.value.includes(o.id))
                  .map(o => o.text)
                  .join(', ');
              }
            } else {
              // Para otros tipos de preguntas
              value = questionResponse.value;
            }
          }
          
          row.push(value);
        });
      
      worksheetData.push(row);
    });
    
    // Crear hoja de trabajo
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Crear libro de trabajo y agregar la hoja
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Respuestas');
    
    // Guardar el archivo
    XLSX.writeFile(workbook, filename);
  } else {
    // Exportación genérica
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
    XLSX.writeFile(workbook, filename);
  }
};

// Función para leer un archivo Excel
export const readExcelFile = async (file: File, type: 'forms' | 'responses'): Promise<any[]> => {
  // Importar xlsx dinámicamente
  const XLSX = await import('xlsx');
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          throw new Error('Failed to read file');
        }
        
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Proceso adicional según el tipo de datos
        if (type === 'forms') {
          // Procesar datos de formularios
          // Aquí podríamos hacer validaciones adicionales
        } else if (type === 'responses') {
          // Procesar datos de respuestas
          // Aquí podríamos hacer validaciones adicionales
        }
        
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsArrayBuffer(file);
  });
};