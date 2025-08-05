import { Form, Question } from '../types';


export const generateOfflineForm = async (form: Form): Promise<string> => {
  // CSS básico sin dependencias externas para evitar problemas de CORS
  const basicCss = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; }
    .container { width: 100%; max-width: 1024px; margin: 0 auto; padding: 1rem; }
    .bg-white { background-color: white; }
    .bg-gray-50 { background-color: #f9fafb; }
    .bg-green-600 { background-color: #059669; }
    .bg-green-700 { background-color: #047857; }
    .rounded-lg { border-radius: 0.5rem; }
    .rounded-md { border-radius: 0.375rem; }
    .border { border: 1px solid #e5e7eb; }
    .border-b { border-bottom: 1px solid #e5e7eb; }
    .border-l-2 { border-left: 2px solid #bbf7d0; }
    .border-gray-300 { border-color: #d1d5db; }
    .text-gray-600 { color: #4b5563; }
    .text-gray-800 { color: #1f2937; }
    .text-white { color: white; }
    .text-red-500 { color: #ef4444; }
    .text-2xl { font-size: 1.5rem; line-height: 2rem; }
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
    .transition-colors { transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, color 0.15s ease-in-out; }
    .focus\\:outline-none:focus { outline: 2px solid transparent; outline-offset: 2px; }
    .focus\\:ring-2:focus { box-shadow: 0 0 0 2px #10b981; }
    .hover\\:bg-green-700:hover { background-color: #047857; }
    input, select, textarea { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.375rem; width: 100%; }
    input:focus, select:focus, textarea:focus { outline: none; border-color: #10b981; box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2); }
    button { cursor: pointer; padding: 0.5rem 1.5rem; border: none; border-radius: 0.375rem; font-weight: 500; transition: background-color 0.15s ease-in-out; }
    .btn-primary { background-color: #059669; color: white; }
    .btn-primary:hover { background-color: #047857; }
    input[type="checkbox"], input[type="radio"] { width: auto; margin-right: 0.5rem; accent-color: #059669; }
    select { background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; }
    .inline-flex { display: inline-flex; }
    label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
    .question-container { border-bottom: 1px solid #e5e7eb; padding-bottom: 1.5rem; margin-bottom: 2rem; }
    .sub-question { margin-left: 2rem; border-left: 2px solid #bbf7d0; padding-left: 1rem; display: none; }
  `;
  
  // Function to generate HTML for a question input
  const generateQuestionInput = (question: Question) => {
    const inputClasses = "w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 border-gray-300";

    switch (question.type) {
      case 'text':
        return `
          <input
            type="text"
            id="${question.id}"
            class="${inputClasses}"
            ${question.required ? 'required' : ''}
          />
        `;
      
      case 'number':
        return `
          <input
            type="number"
            id="${question.id}"
            class="${inputClasses}"
            ${question.required ? 'required' : ''}
          />
        `;

      case 'date':
      case 'time':
        return `
          <input
            type="${question.type}"
            id="${question.id}"
            class="${inputClasses}"
            ${question.required ? 'required' : ''}
          />
        `;
      
      case 'boolean':
        return `
          <div class="space-x-4">
            <label class="inline-flex items-center">
              <input
                type="radio"
                name="${question.id}"
                value="true"
                class="h-5 w-5"
                ${question.required ? 'required' : ''}
                onchange="updateVisibility()"
              />
              <span class="ml-2">Sí</span>
            </label>
            <label class="inline-flex items-center">
              <input
                type="radio"
                name="${question.id}"
                value="false"
                class="h-5 w-5"
                onchange="updateVisibility()"
              />
              <span class="ml-2">No</span>
            </label>
          </div>
        `;
      
      case 'select':
        return `
          <select
            id="${question.id}"
            class="${inputClasses}"
            ${question.required ? 'required' : ''}
            onchange="updateVisibility()"
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
                  class="h-5 w-5 rounded"
                  onchange="updateVisibility()"
                />
                <span class="ml-2">${option.text}</span>
              </label>
            `).join('')}
          </div>
        `;
        
      default:
        return `<p>Tipo de pregunta no soportado: ${question.type}</p>`;
    }
  };

  // Generate HTML for all questions, ensuring correct order for sub-questions
  const generateOrderedQuestionsHtml = (questions: Question[]) => {
    const questionMap = new Map(questions.map(q => [q.id, { ...q, children: [] as Question[] }]));
    const topLevelQuestions: Question[] = [];

    questions.forEach(q => {
      if (q.parentId && questionMap.has(q.parentId)) {
        questionMap.get(q.parentId)!.children.push(q as any);
      } else {
        topLevelQuestions.push(q);
      }
    });

    let orderedQuestions: Question[] = [];
    const traverse = (question: Question) => {
      orderedQuestions.push(question);
      const node = questionMap.get(question.id);
      if (node && node.children) {
        // Sort children by their 'order' property if it exists, to maintain intended sequence
        const sortedChildren = node.children.sort((a, b) => (a.order || 0) - (b.order || 0));
        sortedChildren.forEach(traverse);
      }
    };

    // Sort top-level questions by their 'order' property
    const sortedTopLevel = topLevelQuestions.sort((a, b) => (a.order || 0) - (b.order || 0));
    sortedTopLevel.forEach(traverse);

    return orderedQuestions.map(question => `
      <div id="question-${question.id}" class="question-container ${
        question.parentId ? 'sub-question' : ''
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
  };

  const questionsHtml = generateOrderedQuestionsHtml(form.questions);

  // Generate the complete HTML document
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${form.name}</title>
      <style>${basicCss}</style>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    </head>
    <body class="bg-gray-50 min-h-screen py-8">
      <div class="container">
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
                class="btn-primary"
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
        
        // Format date for display (DD/MM/YYYY)
        function formatDate(date) {
          const d = new Date(date);
          return \`\${String(d.getDate()).padStart(2, '0')}/\${String(d.getMonth() + 1).padStart(2, '0')}/\${d.getFullYear()}\`;
        }
        
        function updateVisibility() {
          const visibleQuestionIds = new Set();
          const formResponses = {};

          formData.questions.forEach(q => {
            if (q.type === 'select' || q.type === 'boolean') {
              const el = document.getElementById(q.id);
              if (el) formResponses[q.id] = el.value;
            } else if (q.type === 'multiselect') {
              const els = document.getElementsByName(q.id);
              formResponses[q.id] = Array.from(els)
                .filter(cb => cb.checked)
                .map(cb => cb.value);
            }
          });

          function getVisibleIds(question) {
            visibleQuestionIds.add(question.id);

            const subQuestions = formData.questions.filter(q => q.parentId === question.id);
            if (subQuestions.length === 0) return;
            
            const parentResponse = formResponses[question.id];
            if (!parentResponse) return;

            subQuestions.forEach(subQuestion => {
              let shouldShow = false;
              if (question.type === 'select' || question.type === 'boolean') {
                shouldShow = subQuestion.parentOptionId === parentResponse;
              } else if (question.type === 'multiselect') {
                shouldShow = Array.isArray(parentResponse) && parentResponse.includes(subQuestion.parentOptionId);
              }

              if (shouldShow) {
                getVisibleIds(subQuestion);
              }
            });
          }

          formData.questions.filter(q => !q.parentId).forEach(getVisibleIds);

          formData.questions.forEach(q => {
            const element = document.getElementById('question-' + q.id);
            if (element) {
              element.style.display = visibleQuestionIds.has(q.id) ? 'block' : 'none';
            }
          });
        }

        document.addEventListener('DOMContentLoaded', updateVisibility);
        
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
        
        // Export to Excel
        function exportToExcel() {
          // Create headers
          const headers = ['Fecha', 'Usuario'];
          formData.questions.forEach(question => {
            headers.push(question.parentId ? '    ' + question.text : question.text);
          });
          
          // Create row data
          const rowData = [formatDate(new Date()), 'Usuario Offline'];
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
          exportToExcel();
        });
      </script>
    </body>
    </html>
  `;
};