// JavaScript para el área de administración del Form Builder
(function($) {
    'use strict';
    
    $(document).ready(function() {
        initializeAdmin();
    });
    
    function initializeAdmin() {
        // Inicializar según la página actual
        const currentPage = new URLSearchParams(window.location.search).get('page');
        
        switch (currentPage) {
            case 'form-builder':
                initializeFormsList();
                break;
            case 'form-builder-create':
                initializeFormBuilder();
                break;
            case 'form-builder-responses':
                initializeResponsesPage();
                break;
        }
    }
    
    function initializeFormsList() {
        loadFormsList();
    }
    
    function loadFormsList() {
        const apiUrl = formBuilderAdmin.rest_url + 'forms';
        
        $.ajax({
            url: apiUrl,
            method: 'GET',
            headers: {
                'X-WP-Nonce': formBuilderAdmin.rest_nonce
            },
            success: function(forms) {
                displayFormsList(forms);
            },
            error: function(xhr, status, error) {
                console.error('Error loading forms:', error);
                $('#form-builder-app').html(
                    '<div class="notice notice-error"><p>Error al cargar los formularios.</p></div>'
                );
            }
        });
    }
    
    function displayFormsList(forms) {
        let html = `
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Descripción</th>
                        <th>Preguntas</th>
                        <th>Versión</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        if (forms.length === 0) {
            html += `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px;">
                        <p>No hay formularios creados aún.</p>
                        <a href="admin.php?page=form-builder-create" class="button button-primary">Crear Primer Formulario</a>
                    </td>
                </tr>
            `;
        } else {
            forms.forEach(form => {
                const date = new Date(form.updatedAt).toLocaleDateString();
                html += `
                    <tr>
                        <td><strong>${form.name}</strong></td>
                        <td>${form.description || '-'}</td>
                        <td>${form.questions ? form.questions.length : 0}</td>
                        <td>${form.version}</td>
                        <td>${date}</td>
                        <td>
                            <a href="admin.php?page=form-builder-create&edit=${form.id}" class="button button-small">Editar</a>
                            <a href="admin.php?page=form-builder-responses&form_id=${form.id}" class="button button-small">Respuestas</a>
                            <button onclick="previewForm('${form.id}')" class="button button-small">Vista Previa</button>
                            <button onclick="deleteForm('${form.id}')" class="button button-small button-link-delete">Eliminar</button>
                        </td>
                    </tr>
                `;
            });
        }
        
        html += `
                </tbody>
            </table>
        `;
        
        $('#form-builder-app').html(html);
    }
    
    // Funciones globales para los botones
    window.previewForm = function(formId) {
        const previewUrl = `${window.location.origin}?form_preview=${formId}`;
        window.open(previewUrl, '_blank');
    };
    
    window.deleteForm = function(formId) {
        if (!confirm('¿Está seguro que desea eliminar este formulario? Esta acción no se puede deshacer.')) {
            return;
        }
        
        const apiUrl = formBuilderAdmin.rest_url + 'forms/' + formId;
        
        $.ajax({
            url: apiUrl,
            method: 'DELETE',
            headers: {
                'X-WP-Nonce': formBuilderAdmin.rest_nonce
            },
            success: function(result) {
                if (result.message) {
                    alert('Formulario eliminado correctamente');
                    loadFormsList();
                } else {
                    alert('Error al eliminar el formulario');
                }
            },
            error: function(xhr, status, error) {
                console.error('Error deleting form:', error);
                alert('Error al eliminar el formulario');
            }
        });
    };
    
    function initializeFormBuilder() {
        loadFormBuilder();
    }
    
    function loadFormBuilder() {
        const isEdit = new URLSearchParams(window.location.search).get('edit');
        
        if (isEdit) {
            loadExistingForm(isEdit);
        } else {
            showFormBuilder();
        }
    }
    
    function loadExistingForm(formId) {
        const apiUrl = formBuilderAdmin.rest_url + 'forms/' + formId;
        
        $.ajax({
            url: apiUrl,
            method: 'GET',
            headers: {
                'X-WP-Nonce': formBuilderAdmin.rest_nonce
            },
            success: function(form) {
                showFormBuilder(form);
            },
            error: function(xhr, status, error) {
                console.error('Error loading form:', error);
                $('#form-builder-editor').html(
                    '<div class="notice notice-error"><p>Error al cargar el formulario.</p></div>'
                );
            }
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
        
        $('#form-builder-editor').html(html);
        
        // Inicializar funcionalidad
        initializeFormBuilderEvents(existingForm);
    }
    
    function initializeFormBuilderEvents(existingForm) {
        let questionCount = 0;
        let questions = existingForm ? existingForm.questions : [];
        
        // Cargar preguntas existentes
        if (questions.length > 0) {
            questions.forEach(question => {
                addQuestionToForm(question, questionCount++);
            });
        }
        
        // Agregar nueva pregunta
        $('#add-question').on('click', function() {
            addQuestionToForm(null, questionCount++);
        });
        
        // Manejar envío del formulario
        $('#form-builder-form').on('submit', function(e) {
            e.preventDefault();
            saveForm(existingForm);
        });
    }
    
    function addQuestionToForm(questionData = null, index) {
        const container = $('#questions-container');
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
        
        container.append(questionHtml);
        
        const questionElement = container.children().last();
        
        // Manejar cambio de tipo
        questionElement.find('.question-type').on('change', function() {
            const optionsDiv = questionElement.find('.question-options');
            optionsDiv.toggle(['select', 'multiselect'].includes($(this).val()));
        });
        
        // Manejar eliminación
        questionElement.find('.remove-question').on('click', function() {
            questionElement.remove();
        });
        
        // Cargar opciones existentes
        if (questionData && questionData.options) {
            const optionsContainer = questionElement.find('.options-container');
            questionData.options.forEach(option => {
                addOptionToQuestion(optionsContainer, option);
            });
        }
        
        // Agregar nueva opción
        questionElement.find('.add-option').on('click', function() {
            const optionsContainer = questionElement.find('.options-container');
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
        
        container.append(optionHtml);
        
        // Manejar eliminación de opción
        container.children().last().find('.remove-option').on('click', function() {
            $(this).parent().remove();
        });
    }
    
    function saveForm(existingForm) {
        const formName = $('#form-name').val();
        const formDescription = $('#form-description').val();
        
        if (!formName.trim()) {
            alert('El nombre del formulario es obligatorio');
            return;
        }
        
        // Recopilar preguntas
        const questions = [];
        $('#questions-container .question-item').each(function() {
            const questionElement = $(this);
            const questionId = questionElement.data('question-id');
            const text = questionElement.find('.question-text').val();
            const type = questionElement.find('.question-type').val();
            const required = questionElement.find('.question-required').is(':checked');
            
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
                questionElement.find('.option-item').each(function() {
                    const optionElement = $(this);
                    const optionText = optionElement.find('.option-text').val();
                    if (optionText.trim()) {
                        question.options.push({
                            id: optionElement.data('option-id'),
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
        const submitButton = $('button[type="submit"]');
        const originalText = submitButton.text();
        submitButton.text('Guardando...').prop('disabled', true);
        
        $.ajax({
            url: apiUrl,
            method: method,
            headers: {
                'X-WP-Nonce': formBuilderAdmin.rest_nonce,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(formData),
            success: function(result) {
                if (result.id) {
                    alert('Formulario guardado correctamente');
                    window.location.href = 'admin.php?page=form-builder';
                } else {
                    alert('Error al guardar el formulario: ' + (result.message || 'Error desconocido'));
                }
            },
            error: function(xhr, status, error) {
                console.error('Error saving form:', error);
                alert('Error al guardar el formulario');
            },
            complete: function() {
                submitButton.text(originalText).prop('disabled', false);
            }
        });
    }
    
    function initializeResponsesPage() {
        const formId = new URLSearchParams(window.location.search).get('form_id');
        if (formId) {
            loadResponses(formId);
        }
    }
    
    function loadResponses(formId) {
        const apiUrl = formBuilderAdmin.rest_url + 'forms/' + formId + '/responses';
        
        $.ajax({
            url: apiUrl,
            method: 'GET',
            headers: {
                'X-WP-Nonce': formBuilderAdmin.rest_nonce
            },
            success: function(responses) {
                displayResponses(responses, formId);
            },
            error: function(xhr, status, error) {
                console.error('Error loading responses:', error);
                $('#responses-container').html(
                    '<div class="notice notice-error"><p>Error al cargar las respuestas.</p></div>'
                );
            }
        });
    }
    
    function displayResponses(responses, formId) {
        let html = `
            <div class="responses-header">
                <h3>Respuestas del Formulario</h3>
                <p>Total de respuestas: ${responses.length}</p>
            </div>
        `;
        
        if (responses.length === 0) {
            html += '<p>No hay respuestas para este formulario aún.</p>';
        } else {
            html += `
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Usuario</th>
                            <th>Respuestas</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            responses.forEach(response => {
                const date = new Date(response.createdAt).toLocaleDateString();
                html += `
                    <tr>
                        <td>${date}</td>
                        <td>${response.username}</td>
                        <td>${response.responses.length} respuestas</td>
                        <td>
                            <button onclick="viewResponse('${response.id}')" class="button button-small">Ver</button>
                            <button onclick="deleteResponse('${response.id}')" class="button button-small button-link-delete">Eliminar</button>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            `;
        }
        
        $('#responses-container').html(html);
    }
    
    // Funciones globales para respuestas
    window.viewResponse = function(responseId) {
        // Implementar vista detallada de respuesta
        alert('Vista detallada de respuesta en desarrollo');
    };
    
    window.deleteResponse = function(responseId) {
        if (!confirm('¿Está seguro que desea eliminar esta respuesta?')) {
            return;
        }
        
        const apiUrl = formBuilderAdmin.rest_url + 'responses/' + responseId;
        
        $.ajax({
            url: apiUrl,
            method: 'DELETE',
            headers: {
                'X-WP-Nonce': formBuilderAdmin.rest_nonce
            },
            success: function(result) {
                if (result.message) {
                    alert('Respuesta eliminada correctamente');
                    location.reload();
                } else {
                    alert('Error al eliminar la respuesta');
                }
            },
            error: function(xhr, status, error) {
                console.error('Error deleting response:', error);
                alert('Error al eliminar la respuesta');
            }
        });
    };
    
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
})(jQuery);