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
     * Get all forms
     */
    private function getForms($user) {
        try {
            $query = "SELECT * FROM forms";
            $params = [];

            // If not admin, only show forms created by user
            if ($user['role'] !== 'admin') {
                $query .= " WHERE created_by = ?";
                $params[] = $user['id'];
            }

            $query .= " ORDER BY updated_at DESC";

            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $forms = $stmt->fetchAll();

            // Parse JSON fields
            foreach ($forms as &$form) {
                $form['questions'] = json_decode($form['questions'], true);
                $form['created_at'] = strtotime($form['created_at']) * 1000; // Convert to milliseconds
                $form['updated_at'] = strtotime($form['updated_at']) * 1000;
            }

            echo json_encode($forms);

        } catch (Exception $e) {
            error_log("Error fetching forms: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Server error']);
        }
    }

    /**
     * Get single form
     */
    private function getForm($id, $user) {
        try {
            $query = "SELECT * FROM forms WHERE id = ?";
            $params = [$id];

            // If not admin, verify ownership
            if ($user['role'] !== 'admin') {
                $query .= " AND created_by = ?";
                $params[] = $user['id'];
            }

            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $form = $stmt->fetch();

            if (!$form) {
                http_response_code(404);
                echo json_encode(['message' => 'Form not found']);
                return;
            }

            // Parse JSON fields
            $form['questions'] = json_decode($form['questions'], true);
            $form['created_at'] = strtotime($form['created_at']) * 1000;
            $form['updated_at'] = strtotime($form['updated_at']) * 1000;

            echo json_encode($form);

        } catch (Exception $e) {
            error_log("Error fetching form: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Server error']);
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

            http_response_code(201);
            echo json_encode($form);

        } catch (Exception $e) {
            error_log("Error creating form: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Server error']);
        }
    }

    /**
     * Update form (admin only)
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
            $stmt = $this->db->prepare("
                UPDATE forms 
                SET name = ?, description = ?, questions = ?, updated_at = NOW(), version = version + 1 
                WHERE id = ?
            ");
            
            $stmt->execute([
                $name,
                $description,
                json_encode($questions),
                $id
            ]);

            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['message' => 'Form not found']);
                return;
            }

            // Get the updated form
            $stmt = $this->db->prepare("SELECT * FROM forms WHERE id = ?");
            $stmt->execute([$id]);
            $form = $stmt->fetch();

            $form['questions'] = json_decode($form['questions'], true);
            $form['created_at'] = strtotime($form['created_at']) * 1000;
            $form['updated_at'] = strtotime($form['updated_at']) * 1000;

            echo json_encode($form);

        } catch (Exception $e) {
            error_log("Error updating form: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Server error']);
        }
    }

    /**
     * Delete form (admin only)
     */
    private function deleteForm($id, $user) {
        $this->auth->requireRole($user, 'admin');

        try {
            // Check if form exists
            $stmt = $this->db->prepare("SELECT id FROM forms WHERE id = ?");
            $stmt->execute([$id]);
            
            if (!$stmt->fetch()) {
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

            echo json_encode(['message' => 'Form deleted']);

        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Error deleting form: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Server error']);
        }
    }
}
?>