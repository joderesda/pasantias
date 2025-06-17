<?php

class Form_Builder_REST_Controller extends WP_REST_Controller {
    
    protected $namespace = 'form-builder/v1';
    
    public function register_routes() {
        // Rutas para formularios
        register_rest_route($this->namespace, '/forms', array(
            array(
                'methods' => WP_REST_Server::READABLE,
                'callback' => array($this, 'get_forms'),
                'permission_callback' => array($this, 'check_permissions')
            ),
            array(
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => array($this, 'create_form'),
                'permission_callback' => array($this, 'check_create_permissions')
            )
        ));
        
        register_rest_route($this->namespace, '/forms/(?P<id>[a-zA-Z0-9-]+)', array(
            array(
                'methods' => WP_REST_Server::READABLE,
                'callback' => array($this, 'get_form'),
                'permission_callback' => array($this, 'check_permissions')
            ),
            array(
                'methods' => WP_REST_Server::EDITABLE,
                'callback' => array($this, 'update_form'),
                'permission_callback' => array($this, 'check_edit_permissions')
            ),
            array(
                'methods' => WP_REST_Server::DELETABLE,
                'callback' => array($this, 'delete_form'),
                'permission_callback' => array($this, 'check_delete_permissions')
            )
        ));
        
        // Rutas para respuestas
        register_rest_route($this->namespace, '/forms/(?P<form_id>[a-zA-Z0-9-]+)/responses', array(
            array(
                'methods' => WP_REST_Server::READABLE,
                'callback' => array($this, 'get_responses'),
                'permission_callback' => array($this, 'check_view_responses_permissions')
            )
        ));
        
        register_rest_route($this->namespace, '/responses', array(
            array(
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => array($this, 'create_response'),
                'permission_callback' => array($this, 'check_permissions')
            )
        ));
        
        register_rest_route($this->namespace, '/responses/import', array(
            array(
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => array($this, 'import_responses'),
                'permission_callback' => array($this, 'check_import_permissions')
            )
        ));
        
        register_rest_route($this->namespace, '/responses/(?P<id>[a-zA-Z0-9-]+)', array(
            array(
                'methods' => WP_REST_Server::EDITABLE,
                'callback' => array($this, 'update_response'),
                'permission_callback' => array($this, 'check_edit_response_permissions')
            ),
            array(
                'methods' => WP_REST_Server::DELETABLE,
                'callback' => array($this, 'delete_response'),
                'permission_callback' => array($this, 'check_delete_response_permissions')
            )
        ));
    }
    
    public function check_permissions($request) {
        return is_user_logged_in();
    }
    
    public function check_create_permissions($request) {
        return current_user_can('create_forms');
    }
    
    public function check_edit_permissions($request) {
        return current_user_can('edit_forms');
    }
    
    public function check_delete_permissions($request) {
        return current_user_can('delete_forms');
    }
    
    public function check_view_responses_permissions($request) {
        return current_user_can('view_responses');
    }
    
    public function check_import_permissions($request) {
        return current_user_can('manage_form_builder');
    }
    
    public function check_edit_response_permissions($request) {
        $response_id = $request['id'];
        $user_id = get_current_user_id();
        
        // Admins pueden editar cualquier respuesta
        if (current_user_can('manage_form_builder')) {
            return true;
        }
        
        // Usuarios pueden editar sus propias respuestas
        global $wpdb;
        $table = $wpdb->prefix . 'form_builder_responses';
        $response = $wpdb->get_row($wpdb->prepare(
            "SELECT user_id FROM $table WHERE id = %s",
            $response_id
        ));
        
        return $response && $response->user_id == $user_id;
    }
    
    public function check_delete_response_permissions($request) {
        return $this->check_edit_response_permissions($request);
    }
    
    public function get_forms($request) {
        global $wpdb;
        $table = $wpdb->prefix . 'form_builder_forms';
        
        $forms = $wpdb->get_results("SELECT * FROM $table ORDER BY updated_at DESC");
        
        $formatted_forms = array();
        foreach ($forms as $form) {
            $formatted_forms[] = array(
                'id' => $form->id,
                'name' => $form->name,
                'description' => $form->description,
                'questions' => json_decode($form->questions, true),
                'createdAt' => strtotime($form->created_at) * 1000,
                'updatedAt' => strtotime($form->updated_at) * 1000,
                'version' => (int)$form->version
            );
        }
        
        return rest_ensure_response($formatted_forms);
    }
    
    public function get_form($request) {
        $form_id = $request['id'];
        
        global $wpdb;
        $table = $wpdb->prefix . 'form_builder_forms';
        
        $form = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table WHERE id = %s",
            $form_id
        ));
        
        if (!$form) {
            return new WP_Error('form_not_found', 'Form not found', array('status' => 404));
        }
        
        $formatted_form = array(
            'id' => $form->id,
            'name' => $form->name,
            'description' => $form->description,
            'questions' => json_decode($form->questions, true),
            'createdAt' => strtotime($form->created_at) * 1000,
            'updatedAt' => strtotime($form->updated_at) * 1000,
            'version' => (int)$form->version
        );
        
        return rest_ensure_response($formatted_form);
    }
    
    public function create_form($request) {
        $params = $request->get_json_params();
        
        if (empty($params['name']) || empty($params['questions'])) {
            return new WP_Error('missing_data', 'Name and questions are required', array('status' => 400));
        }
        
        global $wpdb;
        $table = $wpdb->prefix . 'form_builder_forms';
        
        $form_id = wp_generate_uuid4();
        
        $result = $wpdb->insert(
            $table,
            array(
                'id' => $form_id,
                'name' => sanitize_text_field($params['name']),
                'description' => sanitize_textarea_field($params['description'] ?? ''),
                'questions' => json_encode($params['questions']),
                'created_by' => get_current_user_id(),
                'created_at' => current_time('mysql'),
                'updated_at' => current_time('mysql')
            ),
            array('%s', '%s', '%s', '%s', '%d', '%s', '%s')
        );
        
        if (!$result) {
            return new WP_Error('create_failed', 'Failed to create form', array('status' => 500));
        }
        
        // Obtener el formulario creado
        $form = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table WHERE id = %s",
            $form_id
        ));
        
        $formatted_form = array(
            'id' => $form->id,
            'name' => $form->name,
            'description' => $form->description,
            'questions' => json_decode($form->questions, true),
            'createdAt' => strtotime($form->created_at) * 1000,
            'updatedAt' => strtotime($form->updated_at) * 1000,
            'version' => (int)$form->version
        );
        
        return rest_ensure_response($formatted_form);
    }
    
    public function update_form($request) {
        $form_id = $request['id'];
        $params = $request->get_json_params();
        
        if (empty($params['name']) || empty($params['questions'])) {
            return new WP_Error('missing_data', 'Name and questions are required', array('status' => 400));
        }
        
        global $wpdb;
        $table = $wpdb->prefix . 'form_builder_forms';
        
        // Verificar que el formulario existe
        $existing_form = $wpdb->get_row($wpdb->prepare(
            "SELECT id FROM $table WHERE id = %s",
            $form_id
        ));
        
        if (!$existing_form) {
            return new WP_Error('form_not_found', 'Form not found', array('status' => 404));
        }
        
        $result = $wpdb->update(
            $table,
            array(
                'name' => sanitize_text_field($params['name']),
                'description' => sanitize_textarea_field($params['description'] ?? ''),
                'questions' => json_encode($params['questions']),
                'updated_at' => current_time('mysql'),
                'version' => $wpdb->get_var($wpdb->prepare(
                    "SELECT version + 1 FROM $table WHERE id = %s",
                    $form_id
                ))
            ),
            array('id' => $form_id),
            array('%s', '%s', '%s', '%s', '%d'),
            array('%s')
        );
        
        if ($result === false) {
            return new WP_Error('update_failed', 'Failed to update form', array('status' => 500));
        }
        
        // Obtener el formulario actualizado
        $form = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table WHERE id = %s",
            $form_id
        ));
        
        $formatted_form = array(
            'id' => $form->id,
            'name' => $form->name,
            'description' => $form->description,
            'questions' => json_decode($form->questions, true),
            'createdAt' => strtotime($form->created_at) * 1000,
            'updatedAt' => strtotime($form->updated_at) * 1000,
            'version' => (int)$form->version
        );
        
        return rest_ensure_response($formatted_form);
    }
    
    public function delete_form($request) {
        $form_id = $request['id'];
        
        global $wpdb;
        $forms_table = $wpdb->prefix . 'form_builder_forms';
        $responses_table = $wpdb->prefix . 'form_builder_responses';
        
        // Verificar que el formulario existe
        $form = $wpdb->get_row($wpdb->prepare(
            "SELECT id FROM $forms_table WHERE id = %s",
            $form_id
        ));
        
        if (!$form) {
            return new WP_Error('form_not_found', 'Form not found', array('status' => 404));
        }
        
        // Eliminar respuestas primero
        $wpdb->delete($responses_table, array('form_id' => $form_id), array('%s'));
        
        // Eliminar formulario
        $result = $wpdb->delete($forms_table, array('id' => $form_id), array('%s'));
        
        if (!$result) {
            return new WP_Error('delete_failed', 'Failed to delete form', array('status' => 500));
        }
        
        return rest_ensure_response(array('message' => 'Form deleted successfully'));
    }
    
    public function get_responses($request) {
        $form_id = $request['form_id'];
        
        global $wpdb;
        $responses_table = $wpdb->prefix . 'form_builder_responses';
        $users_table = $wpdb->users;
        
        $responses = $wpdb->get_results($wpdb->prepare(
            "SELECT r.*, u.display_name as username 
             FROM $responses_table r 
             LEFT JOIN $users_table u ON r.user_id = u.ID 
             WHERE r.form_id = %s 
             ORDER BY r.created_at DESC",
            $form_id
        ));
        
        $formatted_responses = array();
        foreach ($responses as $response) {
            $formatted_responses[] = array(
                'id' => $response->id,
                'formId' => $response->form_id,
                'formVersion' => (int)$response->form_version,
                'responses' => json_decode($response->responses, true),
                'createdAt' => strtotime($response->created_at) * 1000,
                'updatedOffline' => (bool)$response->updated_offline,
                'userId' => $response->user_id,
                'username' => $response->username ?: 'Usuario Anónimo'
            );
        }
        
        return rest_ensure_response($formatted_responses);
    }
    
    public function create_response($request) {
        $params = $request->get_json_params();
        
        if (empty($params['formId']) || empty($params['responses'])) {
            return new WP_Error('missing_data', 'Form ID and responses are required', array('status' => 400));
        }
        
        global $wpdb;
        $table = $wpdb->prefix . 'form_builder_responses';
        
        $response_id = wp_generate_uuid4();
        
        $result = $wpdb->insert(
            $table,
            array(
                'id' => $response_id,
                'form_id' => sanitize_text_field($params['formId']),
                'form_version' => (int)($params['formVersion'] ?? 1),
                'responses' => json_encode($params['responses']),
                'user_id' => get_current_user_id(),
                'created_at' => current_time('mysql'),
                'updated_offline' => (bool)($params['updatedOffline'] ?? false)
            ),
            array('%s', '%s', '%d', '%s', '%d', '%s', '%d')
        );
        
        if (!$result) {
            return new WP_Error('create_failed', 'Failed to save response', array('status' => 500));
        }
        
        return rest_ensure_response(array('id' => $response_id, 'message' => 'Response saved successfully'));
    }
    
    public function import_responses($request) {
        $params = $request->get_json_params();
        
        if (empty($params['formId']) || empty($params['responses']) || !is_array($params['responses'])) {
            return new WP_Error('missing_data', 'Form ID and responses array are required', array('status' => 400));
        }
        
        global $wpdb;
        $table = $wpdb->prefix . 'form_builder_responses';
        
        $imported_count = 0;
        $current_user_id = get_current_user_id();
        
        foreach ($params['responses'] as $response_data) {
            if (empty($response_data['responses'])) {
                continue;
            }
            
            $created_at = current_time('mysql');
            if (!empty($response_data['created_at'])) {
                $timestamp = is_numeric($response_data['created_at']) 
                    ? $response_data['created_at'] / 1000 
                    : strtotime($response_data['created_at']);
                $created_at = date('Y-m-d H:i:s', $timestamp);
            }
            
            $result = $wpdb->insert(
                $table,
                array(
                    'id' => wp_generate_uuid4(),
                    'form_id' => sanitize_text_field($params['formId']),
                    'form_version' => (int)($response_data['form_version'] ?? 1),
                    'responses' => json_encode($response_data['responses']),
                    'user_id' => $current_user_id,
                    'created_at' => $created_at,
                    'updated_offline' => (bool)($response_data['updated_offline'] ?? true)
                ),
                array('%s', '%s', '%d', '%s', '%d', '%s', '%d')
            );
            
            if ($result) {
                $imported_count++;
            }
        }
        
        if ($imported_count > 0) {
            return rest_ensure_response(array(
                'message' => "Successfully imported $imported_count responses",
                'imported_count' => $imported_count
            ));
        } else {
            return new WP_Error('import_failed', 'No valid responses could be imported', array('status' => 400));
        }
    }
    
    public function update_response($request) {
        $response_id = $request['id'];
        $params = $request->get_json_params();
        
        if (empty($params['formId']) || empty($params['responses'])) {
            return new WP_Error('missing_data', 'Form ID and responses are required', array('status' => 400));
        }
        
        global $wpdb;
        $table = $wpdb->prefix . 'form_builder_responses';
        
        // Verificar que la respuesta existe
        $existing_response = $wpdb->get_row($wpdb->prepare(
            "SELECT id, user_id FROM $table WHERE id = %s",
            $response_id
        ));
        
        if (!$existing_response) {
            return new WP_Error('response_not_found', 'Response not found', array('status' => 404));
        }
        
        $result = $wpdb->update(
            $table,
            array(
                'form_version' => (int)($params['formVersion'] ?? 1),
                'responses' => json_encode($params['responses']),
                'updated_offline' => (bool)($params['updatedOffline'] ?? false)
            ),
            array('id' => $response_id),
            array('%d', '%s', '%d'),
            array('%s')
        );
        
        if ($result === false) {
            return new WP_Error('update_failed', 'Failed to update response', array('status' => 500));
        }
        
        return rest_ensure_response(array('id' => $response_id, 'message' => 'Response updated successfully'));
    }
    
    public function delete_response($request) {
        $response_id = $request['id'];
        
        global $wpdb;
        $table = $wpdb->prefix . 'form_builder_responses';
        
        // Verificar permisos
        $user_id = get_current_user_id();
        $where_clause = array('id' => $response_id);
        
        if (!current_user_can('manage_form_builder')) {
            $where_clause['user_id'] = $user_id;
        }
        
        $result = $wpdb->delete($table, $where_clause, array('%s', '%d'));
        
        if (!$result) {
            return new WP_Error('delete_failed', 'Response not found or not authorized', array('status' => 404));
        }
        
        return rest_ensure_response(array('message' => 'Response deleted successfully'));
    }
}