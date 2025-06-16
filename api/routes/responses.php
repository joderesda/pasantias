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
     * Import multiple responses (for offline sync) - VERSIÓN COMPLETAMENTE CORREGIDA
     */
    private function importResponses($user) {
        $rawInput = file_get_contents('php://input');
        error_log("=== IMPORT RESPONSES DEBUG START ===");
        error_log("Raw import input: " . $rawInput);
        
        $input = json_decode($rawInput, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("JSON decode error: " . json_last_error_msg());
            http_response_code(400);
            echo json_encode(['message' => 'Invalid JSON: '.json_last_error_msg()]);
            return;
        }

        error_log("Decoded input structure: " . json_encode($input, JSON_PRETTY_PRINT));

        // Validar estructura principal
        if (!isset($input['formId']) || empty($input['formId'])) {
            error_log("ERROR: Missing or empty formId");
            http_response_code(400);
            echo json_encode(['message' => 'formId is required']);
            return;
        }

        if (!isset($input['responses']) || !is_array($input['responses'])) {
            error_log("ERROR: Missing or invalid responses array");
            http_response_code(400);
            echo json_encode(['message' => 'responses array is required']);
            return;
        }

        if (empty($input['responses'])) {
            error_log("ERROR: Empty responses array");
            http_response_code(400);
            echo json_encode(['message' => 'responses array cannot be empty']);
            return;
        }

        error_log("✅ Basic validation passed. FormId: " . $input['formId']);
        error_log("✅ Responses array count: " . count($input['responses']));

        try {
            $this->db->beginTransaction();
            $imported = 0;
            $errors = [];
            
            error_log("Processing " . count($input['responses']) . " response items");
            
            foreach ($input['responses'] as $index => $item) {
                error_log("\n--- Processing response item $index ---");
                error_log("Item structure: " . json_encode($item, JSON_PRETTY_PRINT));
                
                // Validar estructura de cada item
                if (!is_array($item)) {
                    $error = "Response item $index is not an array";
                    $errors[] = $error;
                    error_log("ERROR: $error");
                    continue;
                }

                // Extraer datos del item con valores por defecto
                $formVersion = isset($item['form_version']) ? (int)$item['form_version'] : 1;
                $userId = $item['user_id'] ?? $user['id'];
                $updatedOffline = isset($item['updated_offline']) ? (bool)$item['updated_offline'] : true;
                $responses = $item['responses'] ?? [];
                
                error_log("Item $index extracted data:");
                error_log("  - formVersion: $formVersion");
                error_log("  - userId: $userId");
                error_log("  - updatedOffline: " . ($updatedOffline ? 'true' : 'false'));
                error_log("  - responses count: " . count($responses));
                
                // Validar que hay respuestas
                if (!is_array($responses) || empty($responses)) {
                    $error = "Response item $index has no valid responses array";
                    $errors[] = $error;
                    error_log("ERROR: $error");
                    continue;
                }

                // Procesar y validar cada respuesta individual
                $processedResponses = [];
                foreach ($responses as $responseIndex => $response) {
                    error_log("  Processing individual response $responseIndex: " . json_encode($response));
                    
                    if (!is_array($response)) {
                        $error = "Response $responseIndex in item $index is not an array";
                        $errors[] = $error;
                        error_log("    ERROR: $error");
                        continue;
                    }

                    $questionId = $response['questionId'] ?? null;
                    $value = $response['value'] ?? null;
                    
                    if (empty($questionId)) {
                        $error = "Response $responseIndex in item $index missing questionId";
                        $errors[] = $error;
                        error_log("    ERROR: $error");
                        continue;
                    }

                    // Permitir valores falsy pero no null/undefined
                    if ($value === null) {
                        error_log("    SKIP: Empty value for question $questionId");
                        continue;
                    }

                    $processedResponses[] = [
                        'questionId' => $questionId, // ✅ Mantener questionId como espera el frontend
                        'value' => $value
                    ];
                    
                    error_log("    ✅ Added: questionId=$questionId, value=" . json_encode($value));
                }

                // Solo proceder si hay respuestas válidas procesadas
                if (empty($processedResponses)) {
                    $error = "Response item $index has no valid processed responses";
                    $errors[] = $error;
                    error_log("ERROR: $error");
                    continue;
                }

                error_log("Item $index final processed responses count: " . count($processedResponses));

                // Insertar en la base de datos
                $stmt = $this->db->prepare("
                    INSERT INTO responses 
                    (id, form_id, form_version, responses, user_id, created_at, updated_offline) 
                    VALUES (UUID(), ?, ?, ?, ?, NOW(), ?)
                ");
                
                $jsonResponses = json_encode($processedResponses);
                error_log("Inserting JSON: " . $jsonResponses);
                
                $executeResult = $stmt->execute([
                    $input['formId'],
                    $formVersion,
                    $jsonResponses,
                    $userId,
                    $updatedOffline ? 1 : 0
                ]);
                
                if ($executeResult) {
                    $imported++;
                    error_log("✅ Successfully imported response item $index");
                } else {
                    $error = "Failed to insert response item $index: " . implode(', ', $stmt->errorInfo());
                    $errors[] = $error;
                    error_log("ERROR: $error");
                }
            }
            
            error_log("\n=== IMPORT SUMMARY ===");
            error_log("Imported: $imported");
            error_log("Errors: " . count($errors));
            
            if ($imported > 0) {
                $this->db->commit();
                error_log("✅ Transaction committed successfully");
                
                $response = [
                    'message' => "Imported $imported responses successfully",
                    'importedCount' => $imported
                ];
                
                if (!empty($errors)) {
                    $response['warnings'] = $errors;
                    error_log("Warnings included in response");
                }
                
                echo json_encode($response);
            } else {
                $this->db->rollBack();
                error_log("❌ No responses imported. Rolling back transaction");
                http_response_code(400);
                echo json_encode([
                    'message' => 'No valid responses found in the batch',
                    'errors' => $errors
                ]);
            }
            
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("❌ EXCEPTION during import: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            http_response_code(500);
            echo json_encode(['message' => 'Server error: '.$e->getMessage()]);
        }
        
        error_log("=== IMPORT RESPONSES DEBUG END ===");
    }
}
?>