<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

/**
 * Forms routes
 */
class FormsRoutes {
    private $db;
    private $auth;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->auth = new AuthMiddleware();
    }

    /**
     * Handle forms routes
     */
    public function handleRequest($method, $path, $id = null) {
        $user = $this->auth->authenticate();

        switch ($method) {
            case 'GET':
                if ($id) {
                    $this->getForm($id, $user);
                } else {
                    $this->getForms($user);
                }
                break;
            case 'POST':
                // POST should only be for creating new forms, not on a specific ID
                if ($id) {
                    http_response_code(405); // Method Not Allowed
                    echo json_encode(['message' => 'Cannot POST to a specific resource ID. Use PUT to update.']);
                    return;
                }
                $this->createForm($user);
                break;
            case 'PUT':
                if ($id) {
                    $this->updateForm($id, $user);
                }
                break;
            case 'DELETE':
                if ($id) {
                    $this->deleteForm($id, $user);
                }
                break;
            default:
                http_response_code(405);
                echo json_encode(['message' => 'Method not allowed']);
        }
    }

    /**
     * Get all forms - CORREGIDO: Todos los usuarios pueden ver todos los formularios
     */
    private function getForms($user) {
        try {
            error_log("=== GET FORMS DEBUG START ===");
            error_log("User requesting forms: " . json_encode($user));
            
            // CAMBIO: Todos los usuarios pueden ver todos los formularios
            $query = "SELECT * FROM forms ORDER BY updated_at DESC";
            $params = [];

            error_log("Query: " . $query);
            error_log("Params: " . json_encode($params));

            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $forms = $stmt->fetchAll();

            error_log("Forms found: " . count($forms));

            // Parse JSON fields
            foreach ($forms as &$form) {
                $form['questions'] = json_decode($form['questions'], true);
                $form['created_at'] = strtotime($form['created_at']) * 1000; // Convert to milliseconds
                $form['updated_at'] = strtotime($form['updated_at']) * 1000;
            }

            error_log("Forms processed successfully");
            error_log("=== GET FORMS DEBUG END ===");

            echo json_encode($forms);

        } catch (Exception $e) {
            error_log("Error fetching forms: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            http_response_code(500);
            echo json_encode(['message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * Get single form - CORREGIDO: Todos los usuarios pueden ver cualquier formulario
     */
    private function getForm($id, $user) {
        // Authorization check: only admin and analista can view form previews
        if ($user['role'] !== 'admin' && $user['role'] !== 'analista') {
            http_response_code(403);
            echo json_encode(['message' => 'Forbidden: You do not have permission to view this form.']);
            return;
        }

        try {
            error_log("=== GET SINGLE FORM DEBUG START ===");
            error_log("Form ID: " . $id);
            error_log("User: " . json_encode($user));
            
            // CAMBIO: Todos los usuarios pueden ver cualquier formulario
            $query = "SELECT * FROM forms WHERE id = ?";
            $params = [$id];

            error_log("Query: " . $query);
            error_log("Params: " . json_encode($params));

            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $form = $stmt->fetch();

            if (!$form) {
                error_log("Form not found");
                http_response_code(404);
                echo json_encode(['message' => 'Form not found']);
                return;
            }

            // Parse JSON fields
            $form['questions'] = json_decode($form['questions'], true);
            $form['created_at'] = strtotime($form['created_at']) * 1000;
            $form['updated_at'] = strtotime($form['updated_at']) * 1000;

            error_log("Form found and processed successfully");
            error_log("=== GET SINGLE FORM DEBUG END ===");

            echo json_encode($form);

        } catch (Exception $e) {
            error_log("Error fetching form: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            http_response_code(500);
            echo json_encode(['message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * Create new form (admin only)
     */
    private function createForm($user) {
        $this->auth->requireRole($user, 'admin');

        $input = json_decode(file_get_contents('php://input'), true);
        
        $name = $input['name'] ?? '';
        $description = $input['description'] ?? '';
        $questions = $input['questions'] ?? [];

        if (empty($name) || empty($questions)) {
            http_response_code(400);
            echo json_encode(['message' => 'Name and questions are required']);
            return;
        }

        try {
            error_log("=== CREATE FORM DEBUG START ===");
            error_log("Creating form with data: " . json_encode($input));
            
            $stmt = $this->db->prepare("
                INSERT INTO forms (id, name, description, questions, created_by, created_at, updated_at, version) 
                VALUES (UUID(), ?, ?, ?, ?, NOW(), NOW(), 1)
            ");
            
            $stmt->execute([
                $name,
                $description,
                json_encode($questions),
                $user['id']
            ]);

            // Get the created form
            $stmt = $this->db->prepare("SELECT * FROM forms WHERE created_by = ? ORDER BY created_at DESC LIMIT 1");
            $stmt->execute([$user['id']]);
            $form = $stmt->fetch();

            $form['questions'] = json_decode($form['questions'], true);
            $form['created_at'] = strtotime($form['created_at']) * 1000;
            $form['updated_at'] = strtotime($form['updated_at']) * 1000;

            error_log("Form created successfully with ID: " . $form['id']);
            error_log("=== CREATE FORM DEBUG END ===");

            http_response_code(201);
            echo json_encode($form);

        } catch (Exception $e) {
            error_log("Error creating form: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            http_response_code(500);
            echo json_encode(['message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * Update form (admin only) - CORREGIDO: Actualizar en lugar de crear nuevo
     */
    private function updateForm($id, $user) {
        $this->auth->requireRole($user, 'admin');

        $input = json_decode(file_get_contents('php://input'), true);
        
        $name = $input['name'] ?? '';
        $description = $input['description'] ?? '';
        $questions = $input['questions'] ?? [];

        if (empty($name) || empty($questions)) {
            http_response_code(400);
            echo json_encode(['message' => 'Name and questions are required']);
            return;
        }

        try {
            error_log("=== UPDATE FORM DEBUG START ===");
            error_log("Updating form ID: " . $id);
            error_log("Update data: " . json_encode($input));
            
            // Verificar que el formulario existe
            $checkStmt = $this->db->prepare("SELECT id FROM forms WHERE id = ?");
            $checkStmt->execute([$id]);
            
            if (!$checkStmt->fetch()) {
                error_log("Form not found for update");
                http_response_code(404);
                echo json_encode(['message' => 'Form not found']);
                return;
            }

            // Actualizar el formulario existente
            $stmt = $this->db->prepare("
                UPDATE forms 
                SET name = ?, description = ?, questions = ?, updated_at = NOW(), version = version + 1 
                WHERE id = ?
            ");
            
            $result = $stmt->execute([
                $name,
                $description,
                json_encode($questions),
                $id
            ]);

            if (!$result) {
                error_log("Failed to update form");
                http_response_code(500);
                echo json_encode(['message' => 'Failed to update form']);
                return;
            }

            // Obtener el formulario actualizado
            $stmt = $this->db->prepare("SELECT * FROM forms WHERE id = ?");
            $stmt->execute([$id]);
            $form = $stmt->fetch();

            if (!$form) {
                error_log("Form not found after update");
                http_response_code(404);
                echo json_encode(['message' => 'Form not found after update']);
                return;
            }

            $form['questions'] = json_decode($form['questions'], true);
            $form['created_at'] = strtotime($form['created_at']) * 1000;
            $form['updated_at'] = strtotime($form['updated_at']) * 1000;

            error_log("Form updated successfully");
            error_log("=== UPDATE FORM DEBUG END ===");

            echo json_encode($form);

        } catch (Exception $e) {
            error_log("Error updating form: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            http_response_code(500);
            echo json_encode(['message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * Delete form (admin only)
     */
    private function deleteForm($id, $user) {
        $this->auth->requireRole($user, 'admin');

        try {
            error_log("=== DELETE FORM DEBUG START ===");
            error_log("Deleting form ID: " . $id);
            
            // Check if form exists
            $stmt = $this->db->prepare("SELECT id FROM forms WHERE id = ?");
            $stmt->execute([$id]);
            
            if (!$stmt->fetch()) {
                error_log("Form not found for deletion");
                http_response_code(404);
                echo json_encode(['message' => 'Form not found']);
                return;
            }

            // Start transaction
            $this->db->beginTransaction();

            // Delete responses first (foreign key constraint)
            $stmt = $this->db->prepare("DELETE FROM responses WHERE form_id = ?");
            $stmt->execute([$id]);

            // Delete form
            $stmt = $this->db->prepare("DELETE FROM forms WHERE id = ?");
            $stmt->execute([$id]);

            $this->db->commit();

            error_log("Form deleted successfully");
            error_log("=== DELETE FORM DEBUG END ===");

            echo json_encode(['message' => 'Form deleted']);

        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Error deleting form: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            http_response_code(500);
            echo json_encode(['message' => 'Server error: ' . $e->getMessage()]);
        }
    }
}
?>