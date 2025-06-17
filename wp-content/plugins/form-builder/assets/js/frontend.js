// JavaScript para el frontend del Form Builder
(function($) {
    'use strict';
    
    // Inicializar cuando el DOM esté listo
    $(document).ready(function() {
        initializeFormBuilder();
    });
    
    function initializeFormBuilder() {
        // Inicializar vista previa de formularios
        if ($('#form-preview-container').length) {
            initializeFormPreview();
        }
        
        // Inicializar lista de formularios
        if ($('.form-builder-list').length) {
            initializeFormsList();
        }
    }
    
    function initializeFormPreview() {
        const container = $('#form-preview-container');
        const formId = container.data('form-id');
        
        if (!formId) {
            container.html('<p>ID de formulario no válido</p>');
            return;
        }
        
        loadFormPreview(formId);
    }
    
    function loadFormPreview(formId) {
        const apiUrl = formBuilderAjax.rest_url + 'forms/' + formId;
        
        $.ajax({
            url: apiUrl,
            method: 'GET',
            headers: {
                'X-WP-Nonce': formBuilderAjax.rest_nonce
            },
            success: function(form) {
                displayFormPreview(form);
            },
            error: function(xhr, status, error) {
                console.error('Error loading form:', error);
                $('#form-preview-container').html('<p>Error al cargar el formulario</p>');
            }
        });
    }
    
    function displayFormPreview(form) {
        const container = $('#form-preview-container');
        
        let html = `
            <div class="form-preview-header">
                <h2>${form.name}</h2>
                ${form.description ? `<p class="form-description">${form.description}</p>` : ''}
            </div>
            
            <form id="form-response" class="form-preview-form">
                <input type="hidden" name="form_id" value="${form.id}">
                <input type="hidden" name="form_version" value="${form.version}">
        `;
        
        // Renderizar preguntas principales
        const mainQuestions = form.questions.filter(q => !q.parentId);
        mainQuestions.forEach((question, index) => {
            html += renderQuestion(question, form.questions);
        });
        
        html += `
                <div class="form-actions">
                    <button type="submit" class="submit-button">Enviar Respuestas</button>
                    <button type="button" id="import-responses" class="import-button">Importar Respuestas Excel</button>
                    <input type="file" id="excel-file" accept=".xlsx,.xls" style="display: none;">
                </div>
            </form>
        `;
        
        container.html(html);
        
        // Inicializar eventos
        initializeFormEvents(form);
    }
    
    function renderQuestion(question, allQuestions) {
        let html = `
            <div class="question-container" data-question-id="${question.id}">
                <label class="question-label">
                    ${question.text}
                    ${question.required ? '<span class="required">*</span>' : ''}
                </label>
                <div class="question-input">
                    ${renderQuestionInput(question)}
                </div>
        `;
        
        // Renderizar subpreguntas si existen
        const subQuestions = allQuestions.filter(q => q.parentId === question.id);
        if (subQuestions.length > 0) {
            html += '<div class="sub-questions" style="display: none;">';
            subQuestions.forEach(subQuestion => {
                html += `<div class="sub-question" data-parent-option="${subQuestion.parentOptionId}">`;
                html += renderQuestion(subQuestion, allQuestions);
                html += '</div>';
            });
            html += '</div>';
        }
        
        html += '</div>';
        return html;
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
                let selectHtml = `<select name="question_${question.id}" class="form-select" ${question.required ? 'required' : ''} onchange="handleSelectChange('${question.id}')">`;
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
                                <input type="checkbox" name="question_${question.id}[]" value="${option.id}" onchange="handleMultiselectChange('${question.id}')">
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
    
    function initializeFormEvents(form) {
        // Manejar envío del formulario
        $('#form-response').on('submit', function(e) {
            e.preventDefault();
            submitFormResponse(form);
        });
        
        // Manejar importación de Excel
        $('#import-responses').on('click', function() {
            $('#excel-file').click();
        });
        
        $('#excel-file').on('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                importExcelResponses(file, form);
            }
        });
    }
    
    // Función global para manejar cambios en select
    window.handleSelectChange = function(questionId) {
        const select = $(`select[name="question_${questionId}"]`);
        const selectedValue = select.val();
        const questionContainer = select.closest('.question-container');
        const subQuestions = questionContainer.find('.sub-questions');
        
        if (subQuestions.length > 0) {
            // Ocultar todas las subpreguntas
            subQuestions.find('.sub-question').hide();
            
            // Mostrar subpreguntas relevantes
            if (selectedValue) {
                subQuestions.show();
                subQuestions.find(`.sub-question[data-parent-option="${selectedValue}"]`).show();
            } else {
                subQuestions.hide();
            }
        }
    };
    
    // Función global para manejar cambios en multiselect
    window.handleMultiselectChange = function(questionId) {
        const checkboxes = $(`input[name="question_${questionId}[]"]:checked`);
        const selectedValues = checkboxes.map(function() { return this.value; }).get();
        const questionContainer = checkboxes.first().closest('.question-container');
        const subQuestions = questionContainer.find('.sub-questions');
        
        if (subQuestions.length > 0) {
            // Ocultar todas las subpreguntas
            subQuestions.find('.sub-question').hide();
            
            // Mostrar subpreguntas relevantes
            if (selectedValues.length > 0) {
                subQuestions.show();
                selectedValues.forEach(value => {
                    subQuestions.find(`.sub-question[data-parent-option="${value}"]`).show();
                });
            } else {
                subQuestions.hide();
            }
        }
    };
    
    function submitFormResponse(form) {
        const formElement = $('#form-response')[0];
        const formData = new FormData(formElement);
        
        // Convertir a formato esperado
        const responses = [];
        
        form.questions.forEach(question => {
            const inputName = `question_${question.id}`;
            let value = null;
            
            switch (question.type) {
                case 'multiselect':
                    const checkboxes = $(`input[name="${inputName}[]"]:checked`);
                    value = checkboxes.map(function() { return this.value; }).get();
                    break;
                case 'boolean':
                    const radio = $(`input[name="${inputName}"]:checked`);
                    value = radio.length ? radio.val() === 'true' : null;
                    break;
                case 'number':
                    const numberInput = $(`input[name="${inputName}"]`);
                    value = numberInput.val() ? parseFloat(numberInput.val()) : null;
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
        const submitButton = $('.submit-button');
        const originalText = submitButton.text();
        submitButton.text('Enviando...').prop('disabled', true);
        
        $.ajax({
            url: formBuilderAjax.rest_url + 'responses',
            method: 'POST',
            headers: {
                'X-WP-Nonce': formBuilderAjax.rest_nonce,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(responseData),
            success: function(result) {
                if (result.id) {
                    showMessage('Respuesta enviada correctamente', 'success');
                    $('#form-response')[0].reset();
                    // Ocultar subpreguntas
                    $('.sub-questions').hide();
                } else {
                    showMessage('Error al enviar la respuesta: ' + (result.message || 'Error desconocido'), 'error');
                }
            },
            error: function(xhr, status, error) {
                console.error('Error submitting response:', error);
                showMessage('Error al enviar la respuesta', 'error');
            },
            complete: function() {
                submitButton.text(originalText).prop('disabled', false);
            }
        });
    }
    
    function importExcelResponses(file, form) {
        // Mostrar loading
        const importButton = $('#import-responses');
        const originalText = importButton.text();
        importButton.text('Importando...').prop('disabled', true);
        
        // Crear FormData para enviar el archivo
        const formData = new FormData();
        formData.append('excel_file', file);
        formData.append('form_id', form.id);
        formData.append('action', 'form_builder_action');
        formData.append('form_action', 'import_responses');
        formData.append('nonce', formBuilderAjax.nonce);
        
        $.ajax({
            url: formBuilderAjax.ajaxurl,
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                if (response.success) {
                    showMessage('Respuestas importadas correctamente', 'success');
                } else {
                    showMessage('Error al importar respuestas: ' + (response.data || 'Error desconocido'), 'error');
                }
            },
            error: function(xhr, status, error) {
                console.error('Error importing responses:', error);
                showMessage('Error al importar respuestas', 'error');
            },
            complete: function() {
                importButton.text(originalText).prop('disabled', false);
                $('#excel-file').val(''); // Limpiar input de archivo
            }
        });
    }
    
    function showMessage(message, type) {
        const messageHtml = `
            <div class="form-message ${type}">
                ${message}
            </div>
        `;
        
        // Remover mensajes anteriores
        $('.form-message').remove();
        
        // Agregar nuevo mensaje
        $('#form-response').prepend(messageHtml);
        
        // Auto-remover después de 5 segundos
        setTimeout(function() {
            $('.form-message').fadeOut(function() {
                $(this).remove();
            });
        }, 5000);
        
        // Scroll al mensaje
        $('html, body').animate({
            scrollTop: $('.form-message').offset().top - 20
        }, 500);
    }
    
    function initializeFormsList() {
        // Funcionalidad para la lista de formularios en frontend
        $('.form-item').on('click', function() {
            const formId = $(this).data('form-id');
            window.location.href = `?form_preview=${formId}`;
        });
    }
    
})(jQuery);