<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
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
        $handle_log = __DIR__ . '/debug_handle_request.log';
        $log_info = sprintf(
            "[%s] handleRequest called with: method=%s, path=%s, formId=%s, responseId=%s\n",
            date('Y-m-d H:i:s'), $method, $path, $formId ?? 'null', $responseId ?? 'null'
        );
        file_put_contents($handle_log, $log_info, FILE_APPEND);
        $user = $this->auth->authenticate();

        if ($formId && $method === 'GET') {
            $this->getFormResponses($formId, $user);
        } elseif ($path === '/responses/import' && $method === 'POST') {
            $this->importResponses($user);
        } elseif ($method === 'POST' && $path === '/responses') {
            $this->createResponse($user);
        } elseif ($method === 'PUT' && $responseId) {
            $this->updateResponse($responseId, $user);
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
        // Authorization check: only admin and analista can view responses
        if ($user['role'] !== 'admin' && $user['role'] !== 'analista') {
            http_response_code(403);
            echo json_encode(['message' => 'Forbidden: You do not have permission to view responses.']);
            return;
        }

        try {
            // 1. Get the current form definition to create a legacy ID map
            $formStmt = $this->db->prepare("SELECT questions FROM forms WHERE id = ?");
            $formStmt->execute([$formId]);
            $form = $formStmt->fetch();

            $idMap = [];
            if ($form && !empty($form['questions'])) {
                $questions = json_decode($form['questions'], true);
                foreach ($questions as $question) {
                    if (isset($question['id']) && isset($question['legacy_id'])) {
                        $idMap[$question['legacy_id']] = $question['id'];
                    }
                }
            }

            // 2. Get all responses for the form
            $stmt = $this->db->prepare("
                SELECT r.*, u.username 
                FROM responses r 
                LEFT JOIN users u ON r.user_id = u.id 
                WHERE r.form_id = ? 
                ORDER BY r.created_at DESC
            ");
            $stmt->execute([$formId]);
            $responses = $stmt->fetchAll();

            // 3. Parse and migrate responses on-the-fly
            foreach ($responses as &$response) {
                $decodedAnswers = json_decode($response['responses'], true);
                
                if (is_array($decodedAnswers)) {
                    foreach ($decodedAnswers as &$answer) {
                        if (isset($answer['questionId']) && isset($idMap[$answer['questionId']])) {
                            $answer['questionId'] = $idMap[$answer['questionId']];
                        }
                    }
                }

                $response['responses'] = $decodedAnswers;
                $response['created_at'] = strtotime($response['created_at']) * 1000;
                $response['updated_offline'] = (bool) $response['updated_offline'];
            }

            // Log the data being sent to the frontend
            $log_file = __DIR__ . '/debug_get_responses.log';
            $log_content = "[".date('Y-m-d H:i:s')."] Data for formId $formId:\n" . print_r($responses, true) . "\n---\n";
            file_put_contents($log_file, $log_content, FILE_APPEND);

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
    private function saveSingleResponse($formId, $formVersion, $responses, $userId, $updatedOffline, $createdAt = null) {
        if (empty($formId) || empty($responses)) {
            error_log("Error saving single response: formId or responses are empty.");
            return false;
        }
        try {
            // Ensure user_id exists in the users table to satisfy foreign key constraints
            $stmt_check = $this->db->prepare("SELECT id FROM users WHERE id = ?");
            $stmt_check->execute([$userId]);
            if ($stmt_check->rowCount() === 0) {
                error_log("Error saving single response: User with ID '$userId' not found.");
                return false;
            }

            $sql = "INSERT INTO responses (id, form_id, form_version, responses, user_id, created_at, updated_offline) VALUES (UUID(), ?, ?, ?, ?, " . ($createdAt ? "FROM_UNIXTIME(?)" : "NOW()") . ", ?)";
            $params = [$formId, $formVersion, json_encode($responses), $userId];
            if ($createdAt) {
                $params[] = $createdAt;
            }
            $params[] = $updatedOffline ? 1 : 0;
            $stmt = $this->db->prepare($sql);
            return $stmt->execute($params); // Returns true on success, false on failure
        } catch (PDOException $e) {
            error_log("Error saving single response (SQL): " . $e->getMessage() . " with params: " . print_r($params, true));
            return false;
        }
    }

    private function createResponse($user) {
        $input = json_decode(file_get_contents('php://input'), true);
        $formId = $input['formId'] ?? '';
        $formVersion = $input['formVersion'] ?? 1;
        $responses = $input['responses'] ?? [];
        $updatedOffline = $input['updatedOffline'] ?? false;
        $createdAt = $input['createdAt'] ?? null;

        if (!$this->saveSingleResponse($formId, $formVersion, $responses, $user['id'], $updatedOffline, $createdAt)) {
            http_response_code(400);
            echo json_encode(['message' => 'Form ID and responses are required']);
            return;
        }
        // Get the created response ID
        try {
            $stmt = $this->db->prepare("SELECT id FROM responses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1");
            $stmt->execute([$user['id']]);
            $result = $stmt->fetch();
            $responseId = $result['id'];
            echo json_encode(['id' => $responseId]);
        } catch (Exception $e) {
            error_log("Error fetching response ID: " . $e->getMessage());
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
     * Import multiple responses (for offline sync) - CORREGIDO PARA MÚLTIPLES RESPUESTAS
     */
    private function importResponses($user) {
        $log_file = __DIR__ . '/debug_import.log';
        file_put_contents($log_file, "--- Import request started at " . date('Y-m-d H:i:s') . " ---" . PHP_EOL, FILE_APPEND);

        $raw_payload = file_get_contents('php://input');
        file_put_contents($log_file, "Raw payload: " . $raw_payload . PHP_EOL, FILE_APPEND);
        
        $input = json_decode($raw_payload, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            $error_message = 'Invalid JSON payload. Error: ' . json_last_error_msg();
            http_response_code(400);
            echo json_encode(['message' => $error_message]);
            file_put_contents($log_file, "Error: " . $error_message . PHP_EOL, FILE_APPEND);
            return;
        }
        
        if (!isset($input['formId']) || !isset($input['responses']) || !is_array($input['responses'])) {
            $error_message = 'Invalid payload structure. \"formId\" and \"responses\" array are required.';
            http_response_code(400);
            echo json_encode(['message' => $error_message]);
            file_put_contents($log_file, "Error: " . $error_message . PHP_EOL, FILE_APPEND);
            return;
        }

        $importedCount = 0;
        $formId = $input['formId'];
        $allResponsesFromExcel = $input['responses'];

        file_put_contents($log_file, "Processing " . count($allResponsesFromExcel) . " responses for form ID: $formId" . PHP_EOL, FILE_APPEND);

        foreach ($allResponsesFromExcel as $index => $singleResponseData) {
            // Use snake_case keys sent from the frontend
            $formVersion = $singleResponseData['form_version'] ?? 1;
            $questionAnswers = $singleResponseData['responses'] ?? [];
            $userId = !empty($singleResponseData['user_id']) ? $singleResponseData['user_id'] : $user['id'];
            $updatedOffline = $singleResponseData['updated_offline'] ?? false;
            // Frontend might send timestamp in milliseconds, convert to seconds for FROM_UNIXTIME
            $createdAt = !empty($singleResponseData['created_at']) ? ($singleResponseData['created_at'] / 1000) : null;

            $log_entry = "--- Processing response #" . ($index + 1) . " ---" . PHP_EOL;
            $log_entry .= "Data: " . print_r($singleResponseData, true) . PHP_EOL;

            if (empty($questionAnswers)) {
                $log_entry .= "Result: SKIPPED (empty answers)" . PHP_EOL;
                file_put_contents($log_file, $log_entry, FILE_APPEND);
                continue;
            }

            $isSaved = $this->saveSingleResponse($formId, $formVersion, $questionAnswers, $userId, $updatedOffline, $createdAt);
            
            if ($isSaved) {
                $log_entry .= "Result: SUCCESS" . PHP_EOL;
                $importedCount++;
            } else {
                $log_entry .= "Result: FAILURE" . PHP_EOL;
            }
            file_put_contents($log_file, $log_entry, FILE_APPEND);
        }

        file_put_contents($log_file, "--- Import finished. Total saved: $importedCount ---" . PHP_EOL . PHP_EOL, FILE_APPEND);

        if ($importedCount > 0) {
            http_response_code(200);
            echo json_encode(['message' => "Successfully imported $importedCount responses"]);
        } else {
            http_response_code(400);
            echo json_encode(['message' => 'No valid responses could be saved. Check api/debug_import.log for details.']);
        }
    }
}
?>