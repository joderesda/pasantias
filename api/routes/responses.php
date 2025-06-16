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
     * Create new response - Versión corregida
     */
    private function createResponse($user) {
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            echo json_encode(['message' => 'Invalid JSON: '.json_last_error_msg()]);
            return;
        }

        // Validación más robusta
        $formId = $input['formId'] ?? $input['form_id'] ?? null;
        $formVersion = $input['formVersion'] ?? $input['form_version'] ?? 1;
        $responses = $input['responses'] ?? null;
        $updatedOffline = $input['updatedOffline'] ?? $input['updated_offline'] ?? false;

        if (empty($formId)) {
            http_response_code(400);
            echo json_encode(['message' => 'Form ID is required']);
            return;
        }

        if (!is_array($responses)) {
            http_response_code(400);
            echo json_encode(['message' => 'Responses must be an array']);
            return;
        }

        try {
            // Procesar respuestas para asegurar estructura correcta
            $processedResponses = [];
            foreach ($responses as $r) {
                $questionId = $r['questionId'] ?? $r['question_id'] ?? null;
                $value = $r['value'] ?? null;
                
                if ($questionId !== null && $value !== null) {
                    $processedResponses[] = [
                        'question_id' => $questionId,
                        'value' => $value,
                        'option_id' => $r['optionId'] ?? $r['option_id'] ?? null
                    ];
                }
            }

            if (empty($processedResponses)) {
                http_response_code(400);
                echo json_encode(['message' => 'No valid responses provided']);
                return;
            }

            $stmt = $this->db->prepare("
                INSERT INTO responses (id, form_id, form_version, responses, user_id, created_at, updated_offline) 
                VALUES (UUID(), ?, ?, ?, ?, NOW(), ?)
            ");
            
            $stmt->execute([
                $formId,
                $formVersion,
                json_encode($processedResponses),
                $user['id'],
                $updatedOffline ? 1 : 0
            ]);

            // Obtener el ID de la respuesta creada
            $responseId = $this->db->lastInsertId();

            echo json_encode([
                'id' => $responseId,
                'message' => 'Response created successfully',
                'formId' => $formId,
                'responsesCount' => count($processedResponses)
            ]);

        } catch (Exception $e) {
            error_log("Error creating response: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Server error: '.$e->getMessage()]);
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
     * Import multiple responses (for offline sync) - CORREGIDO PARA MÚLTIPLES RESPUESTAS
     */
    private function importResponses($user) {
        $rawInput = file_get_contents('php://input');
        error_log("Raw import input: " . $rawInput); // Debugging
        
        $input = json_decode($rawInput, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            echo json_encode(['message' => 'Invalid JSON: '.json_last_error_msg()]);
            return;
        }

        // Validate required fields
        if (empty($input['formId']) || empty($input['responses'])) {
            http_response_code(400);
            echo json_encode(['message' => 'formId and responses array are required']);
            return;
        }

        try {
            $this->db->beginTransaction();
            $imported = 0;
            
            foreach ($input['responses'] as $item) {
                // Process each response item
                $formVersion = $item['form_version'] ?? 1;
                $userId = $item['user_id'] ?? $user['id'];
                $updatedOffline = $item['updated_offline'] ?? false;
                $responses = $item['responses'] ?? [];
                
                // Skip if no responses (but don't fail the whole batch)
                if (empty($responses)) {
                    continue;
                }

                // Prepare the response data
                $responseData = [
                    'form_id' => $input['formId'],
                    'form_version' => $formVersion,
                    'responses' => $responses,
                    'user_id' => $userId,
                    'updated_offline' => $updatedOffline
                ];

                $stmt = $this->db->prepare("
                    INSERT INTO responses 
                    (id, form_id, form_version, responses, user_id, created_at, updated_offline) 
                    VALUES (UUID(), ?, ?, ?, ?, NOW(), ?)
                ");
                
                $stmt->execute([
                    $responseData['form_id'],
                    $responseData['form_version'],
                    json_encode($responseData['responses']),
                    $responseData['user_id'],
                    $responseData['updated_offline'] ? 1 : 0
                ]);
                
                $imported++;
            }
            
            $this->db->commit();
            
            if ($imported > 0) {
                echo json_encode([
                    'message' => "Imported $imported responses successfully",
                    'importedCount' => $imported
                ]);
            } else {
                http_response_code(400);
                echo json_encode(['message' => 'No valid responses found in the batch']);
            }
            
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Import error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Server error: '.$e->getMessage()]);
        }
    }
}
?>