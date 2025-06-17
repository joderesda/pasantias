<div class="wrap">
    <h1><?php echo isset($_GET['edit']) ? 'Editar Formulario' : 'Crear Formulario'; ?></h1>
    
    <div id="form-builder-editor">
        <div class="form-builder-loading">
            <p>Cargando editor...</p>
        </div>
    </div>
</div>

<script>
jQuery(document).ready(function($) {
    loadFormBuilder();
});

function loadFormBuilder() {
    const isEdit = new URLSearchParams(window.location.search).get('edit');
    const container = document.getElementById('form-builder-editor');
    
    if (isEdit) {
        // Cargar formulario existente
        loadExistingForm(isEdit);
    } else {
        // Crear nuevo formulario
        showFormBuilder();
    }
}

function loadExistingForm(formId) {
    const apiUrl = formBuilderAdmin.rest_url + 'forms/' + formId;
    
    fetch(apiUrl, {
        method: 'GET',
        headers: {
            'X-WP-Nonce': formBuilderAdmin.rest_nonce,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(form => {
        showFormBuilder(form);
    })
    .catch(error => {
        console.error('Error loading form:', error);
        document.getElementById('form-builder-editor').innerHTML = 
            '<div class="notice notice-error"><p>Error al cargar el formulario.</p></div>';
    });
}

function showFormBuilder(existingForm = null) {
    const isEdit = !!existingForm;
    
    let html = `
        <form id="form-builder-form" class="form-builder-container">
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="form-name">Nombre del Formulario *</label>
                    </th>
                    <td>
                        <input type="text" id="form-name" name="form_name" class="regular-text" 
                               value="${existingForm ? existingForm.name : ''}" required>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="form-description">Descripción</label>
                    </th>
                    <td>
                        <textarea id="form-description" name="form_description" rows="3" class="large-text">${existingForm ? existingForm.description : ''}</textarea>
                    </td>
                </tr>
            </table>
            
            <h3>Preguntas</h3>
            <div id="questions-container">
                <!-- Las preguntas se cargarán aquí -->
            </div>
            
            <p>
                <button type="button" id="add-question" class="button">Agregar Pregunta</button>
            </p>
            
            <p class="submit">
                <button type="submit" class="button button-primary">
                    ${isEdit ? 'Actualizar Formulario' : 'Crear Formulario'}
                </button>
                <a href="admin.php?page=form-builder" class="button">Cancelar</a>
            </p>
        </form>
    `;
    
    document.getElementById('form-builder-editor').innerHTML = html;
    
    // Inicializar funcionalidad
    initializeFormBuilder(existingForm);
}

function initializeFormBuilder(existingForm) {
    let questionCount = 0;
    let questions = existingForm ? existingForm.questions : [];
    
    // Cargar preguntas existentes
    if (questions.length > 0) {
        questions.forEach(question => {
            addQuestionToForm(question, questionCount++);
        });
    }
    
    // Agregar nueva pregunta
    document.getElementById('add-question').addEventListener('click', function() {
        addQuestionToForm(null, questionCount++);
    });
    
    // Manejar envío del formulario
    document.getElementById('form-builder-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveForm(existingForm);
    });
}

function addQuestionToForm(questionData = null, index) {
    const container = document.getElementById('questions-container');
    const questionId = questionData ? questionData.id : generateUUID();
    
    const questionHtml = `
        <div class="question-item" data-question-id="${questionId}">
            <div class="question-header">
                <h4>Pregunta ${index + 1}</h4>
                <button type="button" class="button button-small remove-question">Eliminar</button>
            </div>
            
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label>Texto de la pregunta *</label>
                    </th>
                    <td>
                        <input type="text" class="question-text regular-text" 
                               value="${questionData ? questionData.text : ''}" required>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label>Tipo de pregunta</label>
                    </th>
                    <td>
                        <select class="question-type">
                            <option value="text" ${questionData && questionData.type === 'text' ? 'selected' : ''}>Texto</option>
                            <option value="number" ${questionData && questionData.type === 'number' ? 'selected' : ''}>Número</option>
                            <option value="select" ${questionData && questionData.type === 'select' ? 'selected' : ''}>Selección</option>
                            <option value="multiselect" ${questionData && questionData.type === 'multiselect' ? 'selected' : ''}>Selección Múltiple</option>
                            <option value="date" ${questionData && questionData.type === 'date' ? 'selected' : ''}>Fecha</option>
                            <option value="boolean" ${questionData && questionData.type === 'boolean' ? 'selected' : ''}>Sí/No</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label>Obligatorio</label>
                    </th>
                    <td>
                        <input type="checkbox" class="question-required" 
                               ${questionData && questionData.required ? 'checked' : ''}>
                    </td>
                </tr>
            </table>
            
            <div class="question-options" style="display: ${questionData && ['select', 'multiselect'].includes(questionData.type) ? 'block' : 'none'};">
                <h5>Opciones</h5>
                <div class="options-container">
                    <!-- Las opciones se cargarán aquí -->
                </div>
                <button type="button" class="button button-small add-option">Agregar Opción</button>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', questionHtml);
    
    const questionElement = container.lastElementChild;
    
    // Manejar cambio de tipo
    questionElement.querySelector('.question-type').addEventListener('change', function() {
        const optionsDiv = questionElement.querySelector('.question-options');
        optionsDiv.style.display = ['select', 'multiselect'].includes(this.value) ? 'block' : 'none';
    });
    
    // Manejar eliminación
    questionElement.querySelector('.remove-question').addEventListener('click', function() {
        questionElement.remove();
    });
    
    // Cargar opciones existentes
    if (questionData && questionData.options) {
        const optionsContainer = questionElement.querySelector('.options-container');
        questionData.options.forEach(option => {
            addOptionToQuestion(optionsContainer, option);
        });
    }
    
    // Agregar nueva opción
    questionElement.querySelector('.add-option').addEventListener('click', function() {
        const optionsContainer = questionElement.querySelector('.options-container');
        addOptionToQuestion(optionsContainer);
    });
}

function addOptionToQuestion(container, optionData = null) {
    const optionId = optionData ? optionData.id : generateUUID();
    
    const optionHtml = `
        <div class="option-item" data-option-id="${optionId}">
            <input type="text" class="option-text regular-text" placeholder="Texto de la opción" 
                   value="${optionData ? optionData.text : ''}" required>
            <button type="button" class="button button-small remove-option">Eliminar</button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', optionHtml);
    
    // Manejar eliminación de opción
    container.lastElementChild.querySelector('.remove-option').addEventListener('click', function() {
        this.parentElement.remove();
    });
}

function saveForm(existingForm) {
    const formName = document.getElementById('form-name').value;
    const formDescription = document.getElementById('form-description').value;
    
    if (!formName.trim()) {
        alert('El nombre del formulario es obligatorio');
        return;
    }
    
    // Recopilar preguntas
    const questions = [];
    document.querySelectorAll('.question-item').forEach(questionElement => {
        const questionId = questionElement.dataset.questionId;
        const text = questionElement.querySelector('.question-text').value;
        const type = questionElement.querySelector('.question-type').value;
        const required = questionElement.querySelector('.question-required').checked;
        
        if (!text.trim()) return;
        
        const question = {
            id: questionId,
            text: text.trim(),
            type: type,
            required: required,
            includeInPowerBI: false
        };
        
        // Agregar opciones si es necesario
        if (['select', 'multiselect'].includes(type)) {
            question.options = [];
            questionElement.querySelectorAll('.option-item').forEach(optionElement => {
                const optionText = optionElement.querySelector('.option-text').value;
                if (optionText.trim()) {
                    question.options.push({
                        id: optionElement.dataset.optionId,
                        text: optionText.trim()
                    });
                }
            });
        }
        
        questions.push(question);
    });
    
    if (questions.length === 0) {
        alert('Debe agregar al menos una pregunta');
        return;
    }
    
    const formData = {
        name: formName,
        description: formDescription,
        questions: questions
    };
    
    const isEdit = !!existingForm;
    const apiUrl = formBuilderAdmin.rest_url + 'forms' + (isEdit ? '/' + existingForm.id : '');
    const method = isEdit ? 'PUT' : 'POST';
    
    // Mostrar loading
    const submitButton = document.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Guardando...';
    submitButton.disabled = true;
    
    fetch(apiUrl, {
        method: method,
        headers: {
            'X-WP-Nonce': formBuilderAdmin.rest_nonce,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(result => {
        if (result.id) {
            alert('Formulario guardado correctamente');
            window.location.href = 'admin.php?page=form-builder';
        } else {
            alert('Error al guardar el formulario: ' + (result.message || 'Error desconocido'));
        }
    })
    .catch(error => {
        console.error('Error saving form:', error);
        alert('Error al guardar el formulario');
    })
    .finally(() => {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    });
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
</script>

<style>
.form-builder-container {
    max-width: 800px;
}

.question-item {
    border: 1px solid #ddd;
    padding: 20px;
    margin-bottom: 20px;
    background: #f9f9f9;
}

.question-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.question-header h4 {
    margin: 0;
}

.option-item {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
}

.option-item input {
    margin-right: 10px;
    flex: 1;
}

.question-options {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #ddd;
}

.form-builder-loading {
    text-align: center;
    padding: 40px;
}
</style>
</div>