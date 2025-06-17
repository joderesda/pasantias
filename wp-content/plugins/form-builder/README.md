# Form Builder ODEC - Plugin de WordPress

Sistema de formularios para el Observatorio de Convivencia y Seguridad Ciudadana del Magdalena, migrado de React/Vite a WordPress.

## Características

- ✅ **Gestión completa de formularios** desde el admin de WordPress
- ✅ **Vista previa pública** de formularios para completar
- ✅ **Importación de respuestas** desde archivos Excel
- ✅ **Sistema de permisos** integrado con WordPress
- ✅ **API REST** para integración con otras aplicaciones
- ✅ **Responsive design** para móviles y tablets
- ✅ **Subpreguntas condicionales** basadas en respuestas anteriores

## Instalación

1. **Subir el plugin:**
   ```
   wp-content/plugins/form-builder/
   ```

2. **Activar el plugin** desde el admin de WordPress

3. **Configurar permisos** (se hace automáticamente):
   - Administradores: Acceso completo
   - Editores: Ver respuestas
   - Usuarios: Completar formularios

## Uso

### Área de Administración

1. **Acceder al menú "Formularios ODEC"** en el admin
2. **Crear formularios** con diferentes tipos de preguntas:
   - Texto libre
   - Números
   - Fechas
   - Sí/No
   - Selección única
   - Selección múltiple
3. **Ver y gestionar respuestas** de cada formulario
4. **Exportar datos** para análisis

### Frontend Público

1. **Mostrar lista de formularios** usando el shortcode:
   ```
   [formularios_odec limit="5" show_description="true"]
   ```

2. **Vista previa directa** accediendo a:
   ```
   https://tu-sitio.com/?form_preview=ID_DEL_FORMULARIO
   ```

3. **Importar respuestas Excel** desde la vista previa del formulario

## Estructura del Plugin

```
wp-content/plugins/form-builder/
├── form-builder.php              # Archivo principal del plugin
├── includes/
│   └── class-rest-controller.php # Controlador de API REST
├── templates/
│   ├── admin/                    # Templates del área de administración
│   │   ├── forms-list.php
│   │   ├── form-builder.php
│   │   └── responses.php
│   └── frontend/                 # Templates del frontend
│       ├── forms-list.php
│       └── form-preview.php
├── assets/
│   ├── css/                      # Estilos CSS
│   │   ├── admin.css
│   │   └── frontend.css
│   └── js/                       # JavaScript
│       ├── admin.js
│       └── frontend.js
└── README.md
```

## API REST

El plugin expone una API REST completa:

### Formularios
-  `GET /wp-json/form-builder/v1/forms` - Listar formularios
-  `POST /wp-json/form-builder/v1/forms` - Crear formulario
-  `GET /wp-json/form-builder/v1/forms/{id}` - Obtener formulario
-  `PUT /wp-json/form-builder/v1/forms/{id}` - Actualizar formulario
-  `DELETE /wp-json/form-builder/v1/forms/{id}` - Eliminar formulario

### Respuestas
-  `GET /wp-json/form-builder/v1/forms/{id}/responses` - Listar respuestas
-  `POST /wp-json/form-builder/v1/responses` - Crear respuesta
-  `POST /wp-json/form-builder/v1/responses/import` - Importar respuestas
-  `PUT /wp-json/form-builder/v1/responses/{id}` - Actualizar respuesta
-  `DELETE /wp-json/form-builder/v1/responses/{id}` - Eliminar respuesta

## Personalización del Tema

### Agregar al functions.php

```php
// Manejar vista previa de formularios
add_action('template_redirect', 'handle_form_preview');

function handle_form_preview() {
    if (isset($_GET['form_preview'])) {
        $form_id = sanitize_text_field($_GET['form_preview']);
        include get_template_directory() . '/form-preview-template.php';
        exit;
    }
}
```

### Template personalizado

Crear `form-preview-template.php` en tu tema para personalizar la apariencia de los formularios.

## Importación de Excel

El sistema permite importar múltiples respuestas desde archivos Excel:

1. **Exportar formulario en blanco** para obtener la estructura
2. **Completar respuestas** en Excel (múltiples filas = múltiples respuestas)
3. **Importar archivo** desde la vista previa del formulario

### Formato de Excel esperado:

| Fecha | Usuario | Pregunta 1 | Pregunta 2 | ... |
|-------|---------|------------|------------|-----|
| 15/06/2025 | Usuario 1 | Respuesta 1 | Respuesta 2 | ... |
| 16/06/2025 | Usuario 2 | Respuesta 1 | Respuesta 2 | ... |

## Seguridad

- ✅ **Nonces de WordPress** para todas las operaciones AJAX
- ✅ **Sanitización** de todos los datos de entrada
- ✅ **Verificación de permisos** en cada endpoint
- ✅ **Escape de salida** para prevenir XSS
- ✅ **Validación de tipos** de archivo para importación

## Soporte

Para soporte técnico o consultas sobre el plugin, contactar al equipo de desarrollo del ODEC Magdalena.

## Changelog

### v1.0.0
- Migración completa de React/Vite a WordPress
- Implementación de API REST
- Sistema de permisos integrado
- Importación de respuestas Excel
- Templates responsivos
- Documentación completa