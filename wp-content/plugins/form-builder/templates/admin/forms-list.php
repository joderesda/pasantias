<div class="wrap">
    <h1 class="wp-heading-inline">Formularios ODEC</h1>
    <a href="<?php echo admin_url('admin.php?page=form-builder-create'); ?>" class="page-title-action">Crear Nuevo</a>
    
    <div id="form-builder-app">
        <div class="form-builder-loading">
            <p>Cargando formularios...</p>
        </div>
    </div>
</div>

<script>
jQuery(document).ready(function($) {
    // Cargar la aplicación React aquí
    loadFormBuilderApp();
});

function loadFormBuilderApp() {
    // Esta función cargará la aplicación React
    const container = document.getElementById('form-builder-app');
    
    // Aquí integrarías tu aplicación React compilada
    // Por ahora, mostraremos una tabla básica
    loadFormsList();
}

function loadFormsList() {
    const apiUrl = formBuilderAdmin.rest_url + 'forms';
    
    fetch(apiUrl, {
        method: 'GET',
        headers: {
            'X-WP-Nonce': formBuilderAdmin.rest_nonce,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(forms => {
        displayFormsList(forms);
    })
    .catch(error => {
        console.error('Error loading forms:', error);
        document.getElementById('form-builder-app').innerHTML = 
            '<div class="notice notice-error"><p>Error al cargar los formularios.</p></div>';
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
                    <a href="${formBuilderAdmin.admin_url}admin.php?page=form-builder-create" class="button button-primary">Crear Primer Formulario</a>
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
    
    document.getElementById('form-builder-app').innerHTML = html;
}

function previewForm(formId) {
    // Abrir vista previa en nueva ventana o modal
    const previewUrl = `${window.location.origin}?form_preview=${formId}`;
    window.open(previewUrl, '_blank');
}

function deleteForm(formId) {
    if (!confirm('¿Está seguro que desea eliminar este formulario? Esta acción no se puede deshacer.')) {
        return;
    }
    
    const apiUrl = formBuilderAdmin.rest_url + 'forms/' + formId;
    
    fetch(apiUrl, {
        method: 'DELETE',
        headers: {
            'X-WP-Nonce': formBuilderAdmin.rest_nonce,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(result => {
        if (result.message) {
            alert('Formulario eliminado correctamente');
            loadFormsList(); // Recargar lista
        } else {
            alert('Error al eliminar el formulario');
        }
    })
    .catch(error => {
        console.error('Error deleting form:', error);
        alert('Error al eliminar el formulario');
    });
}
</script>

<style>
.form-builder-loading {
    text-align: center;
    padding: 40px;
}

.wp-list-table th,
.wp-list-table td {
    padding: 12px;
}

.button-small {
    margin-right: 5px;
}
</style>
</div>