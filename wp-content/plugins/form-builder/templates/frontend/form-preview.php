<?php
$form_id = $atts['id'] ?? $_GET['form_preview'] ?? '';

if (empty($form_id)) {
    echo '<p>ID de formulario requerido</p>';
    return;
}
?>

<div id="form-preview-container" data-form-id="<?php echo esc_attr($form_id); ?>">
    <div class="form-preview-loading">
        <p>Cargando formulario...</p>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    loadFormPreview();
});

function loadFormPreview() {
    const container = document.getElementById('form-preview-container');
    const formId = container.dataset.formId;
    
    if (!formId) {
        container.innerHTML = '<p>ID de formulario no válido</p>';
        return;
    }
    
    const apiUrl = formBuilderAjax.rest_url + 'forms/' + formId;
    
    fetch(apiUrl, {
        method: 'GET',
        headers: {
            'X-WP-Nonce': formBuilderAjax.rest_nonce,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(form => {
        displayFormPreview(form);
    })
    .catch(error => {
        console.error('Error loading form:', error);
        container.innerHTML = '<p>Error al cargar el formulario</p>';
    });
}

function displayFormPreview(form) {
    const container = document.getElementById('form-preview-container');
    
    let html = `
        <div class="form-preview-header">
            <h2>${form.name}</h2>
            ${form.description ? `<p class="form-description">${form.description}</p>` : ''}
        </div>
        
        <form id="form-response" class="form-preview-form">
            <input type="hidden" name="form_id" value="${form.id}">
            <input type="hidden" name="form_version" value="${form.version}">
    `;
    
    // Renderizar preguntas
    form.questions.forEach((question, index) => {
        if (question.parentId) return; // Skip sub-questions for now
        
        html += `
            <div class="question-container" data-question-id="${question.id}">
                <label class="question-label">
                    ${question.text}
                    ${question.required ? '<span class="required">*</span>' : ''}
                </label>
                <div class="question-input">
                    ${renderQuestionInput(question)}
                </div>
            </div>
        `;
    });
    
    html += `
            <div class="form-actions">
                <button type="submit" class="submit-button">Enviar Respuestas</button>
                <button type="button" id="import-responses" class="import-button">Importar Respuestas Excel</button>
                <input type="file" id="excel-file" accept=".xlsx,.xls" style="display: none;">
            </div>
        </form>
    `;
    
    container.innerHTML = html;
    
    // Inicializar funcionalidad
    initializeFormPreview(form);
}

function renderQuestionInput(question) {
    switch (question.type) {
        case 'text':
            return `<input type="text" name="question_${question.id}" class="form-input" ${question.required ? 'required' : ''}>`;
        
        case 'number':
            return `<input type="number" name="question_${question.id}" class="form-input" ${question.required ? 'required' : ''}>`;
        
        case 'date':
            return `<input type="date" name="question_${question.id}" class="form-input" ${question.required ? 'required' : ''}>`;
        
        case 'boolean':
            return `
                <div class="radio-group">
                    <label><input type="radio" name="question_${question.id}" value="true" ${question.required ? 'required' : ''}> Sí</label>
                    <label><input type="radio" name="question_${question.id}" value="false"> No</label>
                </div>
            `;
        
        case 'select':
            let selectHtml = `<select name="question_${question.id}" class="form-select" ${question.required ? 'required' : ''}>`;
            selectHtml += '<option value="">Seleccionar...</option>';
            if (question.options) {
                question.options.forEach(option => {
                    selectHtml += `<option value="${option.id}">${option.text}</option>`;
                });
            }
            selectHtml += '</select>';
            return selectHtml;
        
        case 'multiselect':
            let multiselectHtml = '<div class="checkbox-group">';
            if (question.options) {
                question.options.forEach(option => {
                    multiselectHtml += `
                        <label>
                            <input type="checkbox" name="question_${question.id}[]" value="${option.id}">
                            ${option.text}
                        </label>
                    `;
                });
            }
            multiselectHtml += '</div>';
            return multiselectHtml;
        
        default:
            return `<input type="text" name="question_${question.id}" class="form-input">`;
    }
}

function initializeFormPreview(form) {
    // Manejar envío del formulario
    document.getElementById('form-response').addEventListener('submit', function(e) {
        e.preventDefault();
        submitFormResponse(form);
    });
    
    // Manejar importación de Excel
    document.getElementById('import-responses').addEventListener('click', function() {
        document.getElementById('excel-file').click();
    });
    
    document.getElementById('excel-file').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            importExcelResponses(file, form);
        }
    });
}

function submitFormResponse(form) {
    const formElement = document.getElementById('form-response');
    const formData = new FormData(formElement);
    
    // Convertir a formato esperado
    const responses = [];
    
    form.questions.forEach(question => {
        const inputName = `question_${question.id}`;
        let value = null;
        
        switch (question.type) {
            case 'multiselect':
                const checkboxes = formElement.querySelectorAll(`input[name="${inputName}[]"]:checked`);
                value = Array.from(checkboxes).map(cb => cb.value);
                break;
            case 'boolean':
                const radio = formElement.querySelector(`input[name="${inputName}"]:checked`);
                value = radio ? radio.value === 'true' : null;
                break;
            case 'number':
                const numberInput = formElement.querySelector(`input[name="${inputName}"]`);
                value = numberInput && numberInput.value ? parseFloat(numberInput.value) : null;
                break;
            default:
                value = formData.get(inputName);
        }
        
        if (value !== null && value !== '') {
            responses.push({
                questionId: question.id,
                value: value
            });
        }
    });
    
    const responseData = {
        formId: form.id,
        formVersion: form.version,
        responses: responses,
        updatedOffline: false
    };
    
    // Mostrar loading
    const submitButton = document.querySelector('.submit-button');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Enviando...';
    submitButton.disabled = true;
    
    const apiUrl = formBuilderAjax.rest_url + 'responses';
    
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'X-WP-Nonce': formBuilderAjax.rest_nonce,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(responseData)
    })
    .then(response => response.json())
    .then(result => {
        if (result.id) {
            alert('Respuesta enviada correctamente');
            formElement.reset();
        } else {
            alert('Error al enviar la respuesta: ' + (result.message || 'Error desconocido'));
        }
    })
    .catch(error => {
        console.error('Error submitting response:', error);
        alert('Error al enviar la respuesta');
    })
    .finally(() => {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    });
}

function importExcelResponses(file, form) {
    // Esta función necesitaría la librería XLSX para procesar el archivo
    // Por simplicidad, mostraremos un mensaje
    alert('Funcionalidad de importación de Excel en desarrollo. Por favor, complete el formulario manualmente.');
}
</script>

<style>
.form-preview-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

.form-preview-header {
    margin-bottom: 30px;
    text-align: center;
}

.form-preview-header h2 {
    color: #2c5530;
    margin-bottom: 10px;
}

.form-description {
    color: #666;
    font-size: 16px;
}

.question-container {
    margin-bottom: 25px;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 5px;
    background: #f9f9f9;
}

.question-label {
    display: block;
    font-weight: bold;
    margin-bottom: 10px;
    color: #333;
}

.required {
    color: #d63638;
}

.form-input,
.form-select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 3px;
    font-size: 14px;
}

.radio-group,
.checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.radio-group label,
.checkbox-group label {
    display: flex;
    align-items: center;
    font-weight: normal;
    cursor: pointer;
}

.radio-group input,
.checkbox-group input {
    margin-right: 8px;
    width: auto;
}

.form-actions {
    margin-top: 30px;
    text-align: center;
}

.submit-button,
.import-button {
    background: #2c5530;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
    margin: 0 10px;
}

.submit-button:hover,
.import-button:hover {
    background: #1e3a21;
}

.submit-button:disabled {
    background: #ccc;
    cursor: not-allowed;
}

.form-preview-loading {
    text-align: center;
    padding: 40px;
}
</style>
</div>