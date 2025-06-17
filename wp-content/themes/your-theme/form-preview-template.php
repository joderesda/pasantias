<?php
// Template para vista previa de formularios
get_header();

$form_id = sanitize_text_field($_GET['form_preview']);
?>

<div class="container">
    <div class="form-preview-wrapper">
        <!-- Logo ODEC -->
        <div class="odec-header">
            <img src="<?php echo get_template_directory_uri(); ?>/assets/images/logo-odec.jpeg" 
                 alt="ODEC Logo" class="odec-logo">
            <h1>Observatorio de Convivencia y Seguridad Ciudadana del Magdalena</h1>
        </div>
        
        <!-- Contenedor del formulario -->
        <div id="form-preview-container" data-form-id="<?php echo esc_attr($form_id); ?>">
            <div class="form-preview-loading">
                <p>Cargando formulario...</p>
            </div>
        </div>
        
        <!-- Información adicional -->
        <div class="form-footer">
            <p><strong>Importante:</strong> Toda la información proporcionada será tratada de manera confidencial y utilizada únicamente para fines estadísticos y de mejora de la seguridad ciudadana.</p>
            <p>Para más información, contacte al Observatorio de Convivencia y Seguridad Ciudadana del Magdalena.</p>
        </div>
    </div>
</div>

<style>
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.form-preview-wrapper {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    overflow: hidden;
}

.odec-header {
    background: linear-gradient(135deg, #2c5530 0%, #1e3a21 100%);
    color: white;
    padding: 30px;
    text-align: center;
}

.odec-logo {
    max-height: 80px;
    margin-bottom: 20px;
    border-radius: 8px;
}

.odec-header h1 {
    font-size: 24px;
    margin: 0;
    font-weight: 600;
    line-height: 1.3;
}

.form-footer {
    background: #f8f9fa;
    padding: 20px 30px;
    border-top: 1px solid #e9ecef;
    font-size: 14px;
    color: #666;
}

.form-footer p {
    margin: 10px 0;
}

/* Responsive */
@media (max-width: 768px) {
    .container {
        padding: 10px;
    }
    
    .odec-header {
        padding: 20px;
    }
    
    .odec-header h1 {
        font-size: 20px;
    }
    
    .form-footer {
        padding: 15px 20px;
    }
}
</style>

<?php
get_footer();
?>