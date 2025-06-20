import * as XLSX from 'xlsx';
import { Form, FormResponse, Question, QuestionResponse } from '../types';

// Función para exportar datos a Excel
export const exportToExcel = async (
  data: any, 
  filename: string, 
  form?: Form
) => {
  const XLSX = await import('xlsx');
  
  // Si estamos exportando un formulario vacío para completar
  if (form && !Array.isArray(data)) {
    const worksheetData: any[][] = [];
    const headers = ['Pregunta', 'Tipo', 'Respuesta', 'ID'];
    worksheetData.push(headers);
    
    // Procesar cada pregunta del formulario
    form.questions.forEach(question => {
      const row = [
        // Add indentation for sub-questions
        question.parentId ? '    ' + question.text : question.text,
        question.type,
        '',
        question.id
      ];
      
      // Agregar validación según el tipo de pregunta
      switch (question.type) {
        case 'select':
        case 'multiselect':
          if (question.options) {
            const options = question.options.map(opt => `${opt.id}:${opt.text}`).join('|');
            row[2] = options;
          }
          break;
        case 'boolean':
          row[2] = 'true|false';
          break;
        case 'date':
          row[2] = 'DD/MM/YYYY';
          break;
        default:
          row[2] = '';
      }
      
      worksheetData.push(row);
    });
    
    // Crear hoja de trabajo con validaciones
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Ocultar la columna de ID
    worksheet['!cols'] = [
      { wch: 40 }, // Pregunta
      { wch: 15 }, // Tipo
      { wch: 40 }, // Respuesta
      { hidden: true } // ID (oculto)
    ];
    
    // Agregar hoja con instrucciones
    const instructionsData = [
      ['Instrucciones para completar el formulario:'],
      [''],
      ['1. No modifique la estructura del archivo'],
      ['2. Complete sus respuestas en la columna "Respuesta"'],
      ['3. Para preguntas de selección, use los valores exactos mostrados'],
      ['4. Para fechas, use el formato DD/MM/YYYY'],
      ['5. Para Sí/No, use "true" o "false"'],
      ['6. Las preguntas indentadas son sub-preguntas que dependen de la respuesta anterior'],
      ['7. Guarde el archivo y súbalo nuevamente al sistema cuando tenga conexión']
    ];
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    
    // Crear libro y agregar las hojas
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Formulario');
    
    // Guardar archivo
    XLSX.writeFile(workbook, filename);
    return;
  }
  
  // Si estamos exportando respuestas de un formulario
  if (form && Array.isArray(data)) {
    const worksheetData: any[][] = [];
    const headers = ['Fecha', 'Usuario'];
    const questionMap = new Map<string, Question>();
    
    // Include all questions in headers
    form.questions.forEach(question => {
      headers.push(question.parentId ? '    ' + question.text : question.text);
      questionMap.set(question.id, question);
    });
    
    worksheetData.push(headers);
    
    data.forEach((response: FormResponse) => {
      const row: any[] = [
        new Date(response.createdAt),
        response.username || 'Usuario Anónimo'
      ];
      
      form.questions.forEach(question => {
        let value = '';
        
        // Check if sub-question should be visible
        const shouldShowSubQuestion = () => {
          if (!question.parentId) return true;
          
          const parentQuestion = form.questions.find(q => q.id === question.parentId);
          if (!parentQuestion) return false;
          
          const parentResponse = response.responses.find(r => r.questionId === parentQuestion.id);
          if (!parentResponse) return false;
          
          if (parentQuestion.type === 'select') {
            return parentResponse.value === question.parentOptionId;
          }
          
          if (parentQuestion.type === 'multiselect') {
            return Array.isArray(parentResponse.value) && 
                   parentResponse.value.includes(question.parentOptionId);
          }
          
          return false;
        };
        
        if (shouldShowSubQuestion()) {
          const questionResponse = response.responses.find(r => r.questionId === question.id);
          
          if (questionResponse) {
            if (question.type === 'select' && question.options) {
              const option = question.options.find(o => o.id === questionResponse.value);
              value = option ? option.text : '';
            } else if (question.type === 'multiselect' && question.options) {
              if (Array.isArray(questionResponse.value)) {
                value = question.options
                  .filter(o => questionResponse.value.includes(o.id))
                  .map(o => o.text)
                  .join(', ');
              }
            } else if (question.type === 'boolean') {
              value = questionResponse.value === true ? 'Sí' : questionResponse.value === false ? 'No' : '';
            } else {
              value = questionResponse.value;
            }
          }
        }
        
        row.push(value);
      });
      
      worksheetData.push(row);
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    const maxWidth = 50;
    worksheet['!cols'] = headers.map(() => ({ wch: maxWidth }));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Respuestas');
    XLSX.writeFile(workbook, filename);
    return;
  }
  
  // Exportación genérica
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
  XLSX.writeFile(workbook, filename);
};

// Función para leer un archivo Excel
export const readExcelFile = async (file: File, type: 'forms' | 'responses'): Promise<any[]> => {
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
        
        if (type === 'responses') {
          // Procesar y validar respuestas
          const processedData = jsonData.map((row: any) => {
            const responses: QuestionResponse[] = [];
            
            // Procesar cada respuesta
            Object.entries(row).forEach(([key, value]) => {
              if (key !== 'Pregunta' && key !== 'Tipo' && key !== 'ID') {
                const questionId = row['ID'];
                let processedValue = value;
                
                // Convertir valores según el tipo
                switch (row['Tipo']) {
                  case 'boolean':
                    processedValue = value === 'true';
                    break;
                  case 'select':
                    // Extraer el ID de la opción seleccionada
                    const options = row['Respuesta'].split('|');
                    const selectedOption = options.find(opt => opt.split(':')[1] === value);
                    processedValue = selectedOption ? selectedOption.split(':')[0] : value;
                    break;
                  case 'multiselect':
                    // Convertir múltiples selecciones
                    if (typeof value === 'string') {
                      const selectedValues = value.split(',').map(v => v.trim());
                      const options = row['Respuesta'].split('|');
                      processedValue = selectedValues.map(val => {
                        const option = options.find(opt => opt.split(':')[1] === val);
                        return option ? option.split(':')[0] : val;
                      });
                    }
                    break;
                }
                
                responses.push({
                  questionId,
                  value: processedValue
                });
              }
            });
            
            return {
              id: crypto.randomUUID(),
              responses,
              createdAt: new Date().getTime(),
              updatedOffline: true
            };
          });
          
          resolve(processedData);
        } else {
          resolve(jsonData);
        }
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

// Función CORREGIDA para leer respuestas de formularios offline - MEJORADA PARA MÚLTIPLES RESPUESTAS
export const readOfflineResponseFile = async (file: File, currentForm: Form): Promise<FormResponse[]> => {
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
        
        // Buscar la hoja de respuestas (normalmente la primera o la que contiene "Respuestas")
        const responseSheetName = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('respuesta') || 
          name.toLowerCase().includes('response') ||
          name === workbook.SheetNames[0] // Usar la primera hoja como fallback
        ) || workbook.SheetNames[0];
        
        if (!responseSheetName) {
          throw new Error('No se encontró una hoja de respuestas válida');
        }
        
        console.log('Usando hoja:', responseSheetName);
        
        const worksheet = workbook.Sheets[responseSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
          throw new Error('El archivo no contiene datos de respuestas');
        }
        
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1);
        
        console.log('Headers encontrados:', headers);
        console.log('Filas de datos encontradas:', dataRows.length);
        
        // Crear un mapa de preguntas por texto para facilitar la búsqueda
        const questionsByText = new Map<string, Question>();
        currentForm.questions.forEach(question => {
          // Normalizar el texto de la pregunta (quitar espacios extra)
          const normalizedText = question.text.trim();
          const indentedText = '    ' + normalizedText; // Para subpreguntas
          
          questionsByText.set(normalizedText, question);
          questionsByText.set(indentedText, question);
        });
        
        console.log('Preguntas mapeadas:', Array.from(questionsByText.keys()));
        
        const processedResponses: FormResponse[] = [];
        
        // Procesar cada fila de datos
        for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
          const row = dataRows[rowIndex];
          
          if (!row || row.length === 0) {
            console.log(`Fila ${rowIndex + 1} está vacía, saltando...`);
            continue;
          }
          
          console.log(`\n=== Procesando fila ${rowIndex + 1} ===`);
          console.log('Datos de la fila:', row);
          
          // Verificar si la fila tiene respuestas (saltando Fecha y Usuario)
          const hasResponses = row.slice(2).some(cell => cell && cell !== '');
          if (!hasResponses) {
            console.log(`Fila ${rowIndex + 1} no tiene respuestas, saltando...`);
            continue;
          }
          
          const responses: QuestionResponse[] = [];
          let responseCount = 0;
          
          // Procesar cada columna de respuesta (saltando Fecha[0] y Usuario[1])
          for (let colIndex = 2; colIndex < headers.length && colIndex < row.length; colIndex++) {
            const questionText = headers[colIndex];
            const responseValue = row[colIndex];
            
            // Saltar celdas vacías
            if (!responseValue || responseValue === '') {
              continue;
            }
            
            console.log(`  Columna ${colIndex}: "${questionText}" = "${responseValue}"`);
            
            // Buscar la pregunta correspondiente
            const question = questionsByText.get(questionText.trim());
            
            if (!question) {
              console.warn(`  ⚠️ Pregunta no encontrada para texto: "${questionText}"`);
              continue;
            }
            
            console.log(`  ✅ Pregunta encontrada: ${question.id} (${question.type})`);
            
            let processedValue: any = responseValue;
            
            // Convertir el valor según el tipo de pregunta
            switch (question.type) {
              case 'boolean':
                processedValue = responseValue === 'true' || 
                                responseValue === 'Sí' || 
                                responseValue === 'Si' ||
                                responseValue === true;
                console.log(`  Boolean: "${responseValue}" -> ${processedValue}`);
                break;
                
              case 'number':
                processedValue = parseFloat(responseValue);
                if (isNaN(processedValue)) processedValue = responseValue;
                console.log(`  Number: "${responseValue}" -> ${processedValue}`);
                break;
                
              case 'select':
                // Buscar la opción que coincida con el texto de respuesta
                const selectOption = question.options?.find(opt => 
                  opt.text.trim().toLowerCase() === String(responseValue).trim().toLowerCase()
                );
                processedValue = selectOption ? selectOption.id : responseValue;
                console.log(`  Select: "${responseValue}" -> "${processedValue}"`);
                break;
                
              case 'multiselect':
                // Dividir por comas y buscar las opciones correspondientes
                const selectedTexts = String(responseValue).split(',').map(text => text.trim());
                const selectedIds: string[] = [];
                
                selectedTexts.forEach(text => {
                  const option = question.options?.find(opt => 
                    opt.text.trim().toLowerCase() === text.toLowerCase()
                  );
                  if (option) {
                    selectedIds.push(option.id);
                  }
                });
                
                processedValue = selectedIds.length > 0 ? selectedIds : [responseValue];
                console.log(`  Multiselect: "${responseValue}" -> [${selectedIds.join(', ')}]`);
                break;
                
              case 'date':
                // Manejar diferentes formatos de fecha
                if (responseValue instanceof Date) {
                  processedValue = responseValue.toISOString().split('T')[0];
                } else if (typeof responseValue === 'string') {
                  // Intentar parsear diferentes formatos de fecha
                  const dateFormats = [
                    /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
                    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
                  ];
                  
                  if (dateFormats[0].test(responseValue)) {
                    // Convertir DD/MM/YYYY a YYYY-MM-DD
                    const [day, month, year] = responseValue.split('/');
                    processedValue = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                  } else {
                    processedValue = responseValue;
                  }
                }
                console.log(`  Date: "${responseValue}" -> "${processedValue}"`);
                break;
                
              default:
                processedValue = responseValue;
                console.log(`  Text: "${responseValue}" -> "${processedValue}"`);
            }
            
            responses.push({
              questionId: question.id,
              value: processedValue
            });
            
            responseCount++;
            console.log(`  ✅ Respuesta agregada: ${question.id} = ${processedValue}`);
          }
          
          if (responses.length > 0) {
            // Extraer información de fecha y usuario si está disponible
            let createdAt = Date.now();
            
            // Intentar extraer fecha de la primera columna
            if (row[0]) {
              const dateValue = row[0];
              if (dateValue instanceof Date) {
                createdAt = dateValue.getTime();
              } else if (typeof dateValue === 'string') {
                const parsedDate = new Date(dateValue);
                if (!isNaN(parsedDate.getTime())) {
                  createdAt = parsedDate.getTime();
                }
              } else if (typeof dateValue === 'number') {
                // Excel puede devolver fechas como números seriales
                // Convertir número serial de Excel a fecha JavaScript
                const excelEpoch = new Date(1900, 0, 1);
                const jsDate = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
                if (!isNaN(jsDate.getTime())) {
                  createdAt = jsDate.getTime();
                }
              }
            }
            
            const formResponse: FormResponse = {
              id: crypto.randomUUID(),
              formId: currentForm.id,
              formVersion: currentForm.version,
              responses,
              createdAt,
              updatedOffline: true,
              userId: '', // Se asignará en el backend con el usuario autenticado
              username: '' // Se asignará en el backend con el usuario autenticado
            };
            
            processedResponses.push(formResponse);
            console.log(`✅ Respuesta completa ${rowIndex + 1} creada con ${responses.length} respuestas`);
            console.log(`   Fecha: ${new Date(createdAt).toLocaleString()}`);
          } else {
            console.log(`❌ Fila ${rowIndex + 1} no generó respuestas válidas`);
          }
        }
        
        console.log(`\n🎉 RESUMEN: ${processedResponses.length} respuestas procesadas de ${dataRows.length} filas`);
        
        if (processedResponses.length === 0) {
          throw new Error('No se pudieron procesar respuestas válidas del archivo Excel');
        }
        
        resolve(processedResponses);
        
      } catch (error) {
        console.error('❌ Error procesando archivo Excel:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error('❌ Error leyendo archivo:', error);
      reject(error);
    };
    
    reader.readAsArrayBuffer(file);
  });
};