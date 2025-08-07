<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ExportController {
    private $db;
    private $auth;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->auth = new AuthMiddleware();
    }

    /**
     * Export form responses to Excel
     */
    public function exportResponses($formId) {
        try {
            // Verificar autenticación
            $user = $this->auth->authenticate();
            
            // Obtener el formulario
            $formStmt = $this->db->prepare("SELECT * FROM forms WHERE id = ?");
            $formStmt->execute([$formId]);
            $form = $formStmt->fetch(PDO::FETCH_ASSOC);

            if (!$form) {
                http_response_code(404);
                echo json_encode(['message' => 'Form not found']);
                return;
            }

            // Verificar permisos (solo el creador o un admin/analista puede exportar)
            if ($user['role'] !== 'admin' && $user['role'] !== 'analista' && $form['created_by'] !== $user['id']) {
                http_response_code(403);
                echo json_encode(['message' => 'Unauthorized']);
                return;
            }

            // Obtener las respuestas
            $responsesStmt = $this->db->prepare("
                SELECT r.*, u.username 
                FROM responses r 
                LEFT JOIN users u ON r.user_id = u.id 
                WHERE r.form_id = ?
                ORDER BY r.created_at DESC
            ");
            $responsesStmt->execute([$formId]);
            $responses = $responsesStmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($responses)) {
                http_response_code(404);
                echo json_encode(['message' => 'No responses found']);
                return;
            }

            // Crear un nuevo documento de Excel
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            
            // Obtener las preguntas del formulario
            $questions = json_decode($form['questions'], true);
            
            // Configurar los encabezados
            $headers = ['ID', 'Usuario', 'Fecha de creación'];
            $questionMap = [];
            
            // Agregar los títulos de las preguntas como encabezados
            foreach ($questions as $index => $question) {
                $questionId = $question['id'];
                $questionText = $question['question'] ?? "Pregunta " . ($index + 1);
                $questionMap[$questionId] = count($headers);
                $headers[] = $questionText;
            }
            
            // Agregar los encabezados a la hoja
            $sheet->fromArray([$headers], NULL, 'A1');
            
            // Llenar los datos
            $row = 2; // Comenzar en la segunda fila (después de los encabezados)
            
            foreach ($responses as $response) {
                $rowData = [
                    $response['id'],
                    $response['username'] ?? 'Anónimo',
                    $response['created_at']
                ];
                
                // Inicializar las celdas de las preguntas como vacías
                $rowData = array_merge($rowData, array_fill(0, count($questions), ''));
                
                // Procesar las respuestas
                $answers = json_decode($response['responses'], true);
                if (is_array($answers)) {
                    foreach ($answers as $answer) {
                        if (isset($answer['questionId'], $questionMap[$answer['questionId']])) {
                            $colIndex = $questionMap[$answer['questionId']];
                            $rowData[$colIndex] = is_array($answer['value']) ? 
                                implode(', ', $answer['value']) : 
                                $answer['value'];
                        }
                    }
                }
                
                $sheet->fromArray([$rowData], NULL, 'A' . $row);
                $row++;
            }
            
            // Configurar el encabezado para la descarga
            header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            header('Content-Disposition: attachment;filename="respuestas_' . $form['name'] . '.xlsx"');
            header('Cache-Control: max-age=0');
            
            // Guardar el archivo en el buffer de salida
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
            exit;
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'message' => 'Error al exportar las respuestas',
                'error' => $e->getMessage()
            ]);
        }
    }
}
?>
