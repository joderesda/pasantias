<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

/**
 * Responses routes
 */
class ResponsesRoutes {
    private $db;
    private $auth;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->auth = new AuthMiddleware();
    }

    /**
     * Handle responses routes
     */
    public function handleRequest($method, $path, $formId = null, $responseId = null) {
        $user = $this->auth->authenticate();

        if ($formId && $method === 'GET') {
            $this->getFormResponses($formId, $user);
        } elseif ($method === 'POST' && $path === '/responses') {
            $this->createResponse($user);
        } elseif ($method === 'PUT' && $responseId) {
            $this->updateResponse($responseId, $user);
        } elseif ($method === 'POST' && $path === '/responses/import') {
            $this->importResponses($user);
        } elseif ($method === 'DELETE' && $responseId) {
            $this->deleteResponse($responseId, $user);
        } else {
            http_response_code(404);
            echo json_encode(['message' => 'Route not found']);
        }
    }

    /**
     * Get responses for a specific form
     */
    private function getFormResponses($formId, $user) {
        try {
            $stmt = $this->db->prepare("
                SELECT r.*, u.username 
                FROM responses r 
                LEFT JOIN users u ON r.user_id = u.id 
                WHERE r.form_id = ? 
                ORDER BY r.created_at DESC
            ");
            $stmt->execute([$formId]);
            $responses = $stmt->fetchAll();

            // Parse JSON fields and convert timestamps
            foreach ($responses as &$response) {
                $response['responses'] = json_decode($response['responses'], true);
                // Convert MySQL timestamp to milliseconds
                $response['created_at'] = strtotime($response['created_at']) * 1000;
                $response['updated_offline'] = (bool) $response['updated_offline'];
            }

            echo json_encode($responses);

        } catch (Exception $e) {
            error_log("Error fetching responses: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Server error']);
        }
    }

    /**
     * Create new response
     */
    private function createResponse($user) {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $formId = $input['formId'] ?? '';
        $formVersion = $input['formVersion'] ?? 1;
        $responses = $input['responses'] ?? [];
        $updatedOffline = $input['updatedOffline'] ?? false;

        if (empty($formId) || empty($responses)) {
            http_response_code(400);
            echo json_encode(['message' => 'Form ID and responses are required']);
            return;
        }

        try {
            $stmt = $this->db->prepare("
                INSERT INTO responses (id, form_id, form_version, responses, user_id, created_at, updated_offline) 
                VALUES (UUID(), ?, ?, ?, ?, NOW(), ?)
            ");
            
            $stmt->execute([
                $formId,
                $formVersion,
                json_encode($responses),
                $user['id'],
                $updatedOffline ? 1 : 0
            ]);

            // Get the created response ID
            $stmt = $this->db->prepare("SELECT id FROM responses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1");
            $stmt->execute([$user['id']]);
            $result = $stmt->fetch();
            $responseId = $result['id'];

            echo json_encode(['id' => $responseId]);

        } catch (Exception $e) {
            error_log("Error creating response: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Server error']);
        }
    }

    /**
     * Update existing response
     */
    private function updateResponse($responseId, $user) {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $formId = $input['formId'] ?? '';
        $formVersion = $input['formVersion'] ?? 1;
        $responses = $input['responses'] ?? [];
        $updatedOffline = $input['updatedOffline'] ?? false;

        if (empty($formId) || empty($responses)) {
            http_response_code(400);
            echo json_encode(['message' => 'Form ID and responses are required']);
            return;
        }

        try {
            // Check if response exists and user has permission
            $checkStmt = $this->db->prepare("SELECT user_id FROM responses WHERE id = ?");
            $checkStmt->execute([$responseId]);
            $existingResponse = $checkStmt->fetch();

            if (!$existingResponse) {
                http_response_code(404);
                echo json_encode(['message' => 'Response not found']);
                return;
            }

            // Check permissions - users can update their own responses, admins can update any
            if ($user['role'] !== 'admin' && $existingResponse['user_id'] !== $user['id']) {
                http_response_code(403);
                echo json_encode(['message' => 'Not authorized to update this response']);
                return;
            }

            $stmt = $this->db->prepare("
                UPDATE responses 
                SET form_version = ?, responses = ?, updated_offline = ?
                WHERE id = ?
            ");
            
            $stmt->execute([
                $formVersion,
                json_encode($responses),
                $updatedOffline ? 1 : 0,
                $responseId
            ]);

            echo json_encode(['id' => $responseId, 'message' => 'Response updated successfully']);

        } catch (Exception $e) {
            error_log("Error updating response: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Server error']);
        }
    }

    /**
     * Delete response
     */
    private function deleteResponse($responseId, $user) {
        try {
            // Check permissions - users can delete their own responses, admins can delete any
            $query = "DELETE FROM responses WHERE id = ?";
            $params = [$responseId];

            if ($user['role'] !== 'admin') {
                $query .= " AND user_id = ?";
                $params[] = $user['id'];
            }

            $stmt = $this->db->prepare($query);
            $stmt->execute($params);

            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['message' => 'Response not found or not authorized']);
                return;
            }

            echo json_encode(['message' => 'Response deleted']);

        } catch (Exception $e) {
            error_log("Error deleting response: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Server error']);
        }
    }

    /**
     * Import multiple responses (for offline sync)
     */
    private function importResponses($user) {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!is_array($input)) {
            http_response_code(400);
            echo json_encode(['message' => 'Invalid input format']);
            return;
        }

        try {
            $this->db->beginTransaction();

            foreach ($input as $responseData) {
                $stmt = $this->db->prepare("
                    INSERT INTO responses (id, form_id, form_version, responses, user_id, created_at, updated_offline) 
                    VALUES (UUID(), ?, ?, ?, ?, FROM_UNIXTIME(?), 1)
                ");
                
                // Convert timestamp from milliseconds to seconds for MySQL
                $createdAtSeconds = isset($responseData['createdAt']) ? 
                    intval($responseData['createdAt'] / 1000) : time();
                
                $stmt->execute([
                    $responseData['formId'],
                    $responseData['formVersion'],
                    json_encode($responseData['responses']),
                    $user['id'],
                    $createdAtSeconds
                ]);
            }

            $this->db->commit();
            echo json_encode(['message' => 'Responses imported']);

        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Error importing responses: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Server error']);
        }
    }
}
?>