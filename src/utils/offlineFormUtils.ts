import { Form, Question } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const generateOfflineForm = async (form: Form): Promise<string> => {
  // Attempt to fetch Tailwind CSS with fallback
  let tailwindCss = '';
  try {
    tailwindCss = await fetch('https://cdn.tailwindcss.com').then(res => res.text());
  } catch (error) {
    // Fallback minimal CSS for core functionality
    tailwindCss = `
      .container { width: 100%; max-width: 1024px; margin-left: auto; margin-right: auto; padding-left: 1rem; padding-right: 1rem; }
      .bg-white { background-color: white; }
      .bg-gray-50 { background-color: #f9fafb; }
      .bg-green-600 { background-color: #059669; }
      .hover\\:bg-green-700:hover { background-color: #047857; }
      .rounded-lg { border-radius: 0.5rem; }
      .rounded-md { border-radius: 0.375rem; }
      .border { border-width: 1px; }
      .border-b { border-bottom-width: 1px; }
      .border-l-2 { border-left-width: 2px; }
      .border-gray-200 { border-color: #e5e7eb; }
      .border-gray-300 { border-color: #d1d5db; }
      .border-l-green-200 { border-left-color: #bbf7d0; }
      .text-gray-600 { color: #4b5563; }
      .text-gray-800 { color: #1f2937; }
      .text-white { color: white; }
      .text-red-500 { color: #ef4444; }
      .text-2xl { font-size: 1.5rem; }
      .font-medium { font-weight: 500; }
      .font-bold { font-weight: 700; }
      .min-h-screen { min-height: 100vh; }
      .p-6 { padding: 1.5rem; }
      .px-4 { padding-left: 1rem; padding-right: 1rem; }
      .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
      .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
      .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
      .pb-6 { padding-bottom: 1.5rem; }
      .pl-4 { padding-left: 1rem; }
      .ml-1 { margin-left: 0.25rem; }
      .ml-2 { margin-left: 0.5rem; }
      .ml-8 { margin-left: 2rem; }
      .mt-2 { margin-top: 0.5rem; }
      .mt-8 { margin-top: 2rem; }
      .mb-2 { margin-bottom: 0.5rem; }
      .mb-6 { margin-bottom: 1.5rem; }
      .block { display: block; }
      .flex { display: flex; }
      .hidden { display: none; }
      .h-5 { height: 1.25rem; }
      .w-5 { width: 1.25rem; }
      .w-full { width: 100%; }
      .items-start { align-items: flex-start; }
      .items-center { align-items: center; }
      .justify-end { justify-content: flex-end; }
      .space-x-4 > * + * { margin-left: 1rem; }
      .space-y-2 > * + * { margin-top: 0.5rem; }
      .space-y-8 > * + * { margin-top: 2rem; }
      .shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
      .transition-colors { transition-property: background-color, border-color, color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
      .focus\\:outline-none:focus { outline: 2px solid transparent; outline-offset: 2px; }
      .focus\\:ring-2:focus { box-shadow: 0 0 0 2px #10b981; }
      .focus\\:ring-green-500:focus { box-shadow: 0 0 0 2px #10b981; }
      input[type="checkbox"] { accent-color: #059669; }
      input[type="radio"] { accent-color: #059669; }
      select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; }
    `;
  }
  
  // Function to generate HTML for a question input
  const generateQuestionInput = (question: Question) => {
    switch (question.type) {
      case 'text':
        return `
          <input
            type="text"
            id="${question.id}"
            class="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 border-gray-300"
            ${question.required ? 'required' : ''}
          />
        `;
      
      case 'number':
        return `
          <input
            type="number"
            id="${question.id}"
            class="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 border-gray-300"
            ${question.required ? 'required' : ''}
          />
        `;
      
      case 'date':
        return `
          <input
            type="date"
            id="${question.id}"
            class="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 border-gray-300"
            ${question.required ? 'required' : ''}
          />
        `;
      
      case 'boolean':
        return `
          <div class="flex space-x-4">
            <label class="inline-flex items-center">
              <input
                type="radio"
                name="${question.id}"
                value="true"
                class="h-5 w-5 text-green-600 focus:ring-green-500"
                ${question.required ? 'required' : ''}
              />
              <span class="ml-2">Sí</span>
            </label>
            <label class="inline-flex items-center">
              <input
                type="radio"
                name="${question.id}"
                value="false"
                class="h-5 w-5 text-green-600 focus:ring-green-500"
              />
              <span class="ml-2">No</span>
            </label>
          </div>
        `;
      
      case 'select':
        return `
          <select
            id="${question.id}"
            class="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 border-gray-300"
            ${question.required ? 'required' : ''}
            onchange="handleSelectChange('${question.id}')"
          >
            <option value="">Seleccionar...</option>
            ${question.options?.map(option => `
              <option value="${option.id}">${option.text}</option>
            `).join('')}
          </select>
        `;
      
      case 'multiselect':
        return `
          <div class="space-y-2">
            ${question.options?.map(option => `
              <label class="flex items-center">
                <input
                  type="checkbox"
                  name="${question.id}"
                  value="${option.id}"
                  class="h-5 w-5 text-green-600 focus:ring-green-500 rounded"
                  onchange="handleMultiselectChange('${question.id}')"
                />
                <span class="ml-2">${option.text}</span>
              </label>
            `).join('')}
          </div>
        `;
      
      default:
        return '';
    }
  };

  // Generate HTML for all questions
  const questionsHtml = form.questions.map(question => `
    <div id="question-${question.id}" class="border-b border-gray-200 pb-6 ${
      question.parentId ? 'ml-8 border-l-2 border-l-green-200 pl-4 hidden' : ''
    }">
      <div class="mb-2 flex items-start">
        <label class="block text-gray-800 font-medium">
          ${question.text}
          ${question.required ? '<span class="text-red-500 ml-1">*</span>' : ''}
        </label>
      </div>
      <div class="mt-2">
        ${generateQuestionInput(question)}
      </div>
    </div>
  `).join('');

  // Generate the complete HTML document
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${form.name}</title>
      <style>${tailwindCss}</style>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    </head>
    <body class="bg-gray-50 min-h-screen py-8">
      <div class="container mx-auto px-4">
        <div class="bg-white rounded-lg shadow-md p-6">
          <div class="mb-6">
            <h1 class="text-2xl font-bold text-gray-800">${form.name}</h1>
            ${form.description ? `<p class="text-gray-600 mt-2">${form.description}</p>` : ''}
          </div>
          
          <form id="offlineForm" class="space-y-8">
            ${questionsHtml}
            
            <div class="flex justify-end mt-8">
              <button
                type="submit"
                class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Guardar Respuestas
              </button>
            </div>
          </form>
        </div>
      </div>

      <script>
        // Form data
        const formData = ${JSON.stringify(form)};
        
        // Question visibility state
        const visibilityState = {};
        
        // Format date for display (DD/MM/YYYY)
        function formatDate(date) {
          const d = new Date(date);
          return \`\${String(d.getDate()).padStart(2, '0')}/\${String(d.getMonth() + 1).padStart(2, '0')}/\${d.getFullYear()}\`;
        }
        
        // Handle select change
        function handleSelectChange(questionId) {
          const select = document.getElementById(questionId);
          const selectedValue = select.value;
          
          // Find sub-questions
          formData.questions.forEach(question => {
            if (question.parentId === questionId) {
              const element = document.getElementById('question-' + question.id);
              if (element) {
                element.style.display = question.parentOptionId === selectedValue ? 'block' : 'none';
              }
            }
          });
        }
        
        // Handle multiselect change
        function handleMultiselectChange(questionId) {
          const checkboxes = document.getElementsByName(questionId);
          const selectedValues = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
          
          // Find sub-questions
          formData.questions.forEach(question => {
            if (question.parentId === questionId) {
              const element = document.getElementById('question-' + question.id);
              if (element) {
                element.style.display = selectedValues.includes(question.parentOptionId) ? 'block' : 'none';
              }
            }
          });
        }
        
        // Get question value for export
        function getQuestionValue(question) {
          let value = null;
          
          // Check if question is visible
          const questionElement = document.getElementById('question-' + question.id);
          if (!questionElement || questionElement.style.display === 'none') {
            return '';
          }
          
          switch (question.type) {
            case 'text':
            case 'date':
              const input = document.getElementById(question.id);
              value = input.value;
              if (question.type === 'date' && value) {
                value = formatDate(value);
              }
              break;
            
            case 'number':
              const numInput = document.getElementById(question.id);
              value = numInput.value ? parseFloat(numInput.value) : '';
              break;
            
            case 'boolean':
              const radios = document.getElementsByName(question.id);
              const selectedRadio = Array.from(radios).find(r => r.checked);
              if (selectedRadio) {
                value = selectedRadio.value === 'true' ? 'Sí' : 'No';
              }
              break;
            
            case 'select':
              const select = document.getElementById(question.id);
              if (select.value) {
                const option = question.options?.find(o => o.id === select.value);
                value = option ? option.text : '';
              }
              break;
            
            case 'multiselect':
              const checkboxes = document.getElementsByName(question.id);
              const selectedValues = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => {
                  const option = question.options?.find(o => o.id === cb.value);
                  return option ? option.text : '';
                });
              value = selectedValues.join(', ');
              break;
          }
          
          return value || '';
        }
        
        // Get form responses for internal storage
        function getFormResponses() {
          const responses = [];
          
          formData.questions.forEach(question => {
            let value = null;
            
            // Check if question is visible
            const questionElement = document.getElementById('question-' + question.id);
            if (!questionElement || questionElement.style.display === 'none') {
              return;
            }
            
            switch (question.type) {
              case 'text':
              case 'number':
              case 'date':
                const input = document.getElementById(question.id);
                value = input.value;
                if (question.type === 'number' && value) {
                  value = parseFloat(value);
                }
                break;
              
              case 'boolean':
                const radios = document.getElementsByName(question.id);
                const selectedRadio = Array.from(radios).find(r => r.checked);
                if (selectedRadio) {
                  value = selectedRadio.value === 'true';
                }
                break;
              
              case 'select':
                const select = document.getElementById(question.id);
                value = select.value;
                break;
              
              case 'multiselect':
                const checkboxes = document.getElementsByName(question.id);
                value = Array.from(checkboxes)
                  .filter(cb => cb.checked)
                  .map(cb => cb.value);
                break;
            }
            
            if (value !== null) {
              responses.push({
                questionId: question.id,
                value: value
              });
            }
          });
          
          return {
            id: crypto.randomUUID(),
            formId: formData.id,
            formVersion: formData.version,
            responses: responses,
            createdAt: Date.now(),
            updatedOffline: true
          };
        }
        
        // Export to Excel
        function exportToExcel(formResponse) {
          // Create headers
          const headers = ['Fecha'];
          formData.questions.forEach(question => {
            headers.push(question.parentId ? '    ' + question.text : question.text);
          });
          
          // Create row data
          const rowData = [formatDate(formResponse.createdAt)];
          formData.questions.forEach(question => {
            rowData.push(getQuestionValue(question));
          });
          
          // Create worksheet
          const ws = XLSX.utils.aoa_to_sheet([headers, rowData]);
          
          // Set column widths
          const maxWidth = 50;
          ws['!cols'] = headers.map(() => ({ wch: maxWidth }));
          
          // Create workbook and add worksheet
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Respuestas');
          
          // Save file
          XLSX.writeFile(wb, \`respuesta_\${formData.name.replace(/\\s+/g, '_').toLowerCase()}.xlsx\`);
        }
        
        // Form submit handler
        document.getElementById('offlineForm').addEventListener('submit', function(e) {
          e.preventDefault();
          
          // Get form responses
          const formResponse = getFormResponses();
          
          // Export to Excel
          exportToExcel(formResponse);
        });
      </script>
    </body>
    </html>
  `;
};