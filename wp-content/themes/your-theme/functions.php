<?php
// Agregar estas líneas al functions.php de tu tema activo

// Manejar vista previa de formularios en el frontend
add_action('template_redirect', 'handle_form_preview');

function handle_form_preview() {
    if (isset($_GET['form_preview'])) {
        $form_id = sanitize_text_field($_GET['form_preview']);
        
        // Cargar template personalizado para vista previa
        include get_template_directory() . '/form-preview-template.php';
        exit;
    }
}

// Agregar shortcode para mostrar lista de formularios
add_shortcode('formularios_odec', 'display_forms_list');

function display_forms_list($atts) {
    $atts = shortcode_atts(array(
        'limit' => 10,
        'show_description' => true
    ), $atts);
    
    // Obtener formularios usando la API REST
    $response = wp_remote_get(rest_url('form-builder/v1/forms'));
    
    if (is_wp_error($response)) {
        return '<p>Error al cargar los formularios.</p>';
    }
    
    $forms = json_decode(wp_remote_retrieve_body($response), true);
    
    if (empty($forms)) {
        return '<p>No hay formularios disponibles.</p>';
    }
    
    ob_start();
    ?>
    <div class="formularios-odec-list">
        <?php foreach (array_slice($forms, 0, $atts['limit']) as $form): ?>
            <div class="form-item" data-form-id="<?php echo esc_attr($form['id']); ?>">
                <h3><?php echo esc_html($form['name']); ?></h3>
                <?php if ($atts['show_description'] && !empty($form['description'])): ?>
                    <p><?php echo esc_html($form['description']); ?></p>
                <?php endif; ?>
                <a href="?form_preview=<?php echo esc_attr($form['id']); ?>" class="button">
                    Completar Formulario
                </a>
            </div>
        <?php endforeach; ?>
    </div>
    
    <style>
    .formularios-odec-list {
        display: grid;
        gap: 20px;
        margin: 20px 0;
    }
    
    .form-item {
        border: 1px solid #ddd;
        padding: 20px;
        border-radius: 8px;
        background: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .form-item h3 {
        color: #2c5530;
        margin-bottom: 10px;
    }
    
    .form-item .button {
        background: #2c5530;
        color: white;
        text-decoration: none;
        padding: 10px 20px;
        border-radius: 4px;
        display: inline-block;
        margin-top: 10px;
    }
    
    .form-item .button:hover {
        background: #1e3a21;
    }
    </style>
    <?php
    return ob_get_clean();
}

// Agregar estilos para el frontend
add_action('wp_enqueue_scripts', 'enqueue_form_builder_styles');

function enqueue_form_builder_styles() {
    if (isset($_GET['form_preview']) || has_shortcode(get_post()->post_content ?? '', 'formularios_odec')) {
        wp_enqueue_style(
            'form-builder-frontend',
            plugins_url('form-builder/assets/css/frontend.css'),
            array(),
            '1.0.0'
        );
        
        wp_enqueue_script(
            'form-builder-frontend',
            plugins_url('form-builder/assets/js/frontend.js'),
            array('jquery'),
            '1.0.0',
            true
        );
        
        wp_localize_script('form-builder-frontend', 'formBuilderAjax', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('form_builder_nonce'),
            'rest_url' => rest_url('form-builder/v1/'),
            'rest_nonce' => wp_create_nonce('wp_rest')
        ));
    }
}