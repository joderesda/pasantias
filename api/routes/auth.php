<?php
require_once __DIR__ . '/../config/database.php';

/**
 * Authentication routes
 */
class AuthRoutes {
    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        
        // Start session if not already started
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    /**
     * Handle authentication routes
     */
    public function handleRequest($method, $path) {
        switch ($path) {
            case '/register':
                if ($method === 'POST') {
                    $this->register();
                }
                break;
            case '/login':
                if ($method === 'POST') {
                    $this->login();
                }
                break;
            case '/logout':
                if ($method === 'POST') {
                    $this->logout();
                }
                break;
            default:
                http_response_code(404);
                echo json_encode(['message' => 'Route not found']);
        }
    }

    /**
     * Register new user
     */
    private function register() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';
        $role = $input['role'] ?? 'user';

        if (empty($username) || empty($password)) {
            http_response_code(400);
            echo json_encode(['message' => 'Username and password are required']);
            return;
        }

        try {
            // Check if user already exists
            $stmt = $this->db->prepare("SELECT id FROM users WHERE username = ?");
            $stmt->execute([$username]);
            
            if ($stmt->fetch()) {
                http_response_code(400);
                echo json_encode(['message' => 'Username already exists']);
                return;
            }

            // Hash password
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

            // Insert new user
            $stmt = $this->db->prepare("
                INSERT INTO users (id, username, password, role, created_at) 
                VALUES (UUID(), ?, ?, ?, NOW())
            ");
            $stmt->execute([$username, $hashedPassword, $role]);

            // Get the created user
            $stmt = $this->db->prepare("SELECT id, username, role FROM users WHERE username = ?");
            $stmt->execute([$username]);
            $user = $stmt->fetch();

            // Store user in session
            $_SESSION['user'] = [
                'id' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role']
            ];

            echo json_encode([
                'success' => true,
                'user' => $_SESSION['user']
            ]);

        } catch (Exception $e) {
            error_log("Registration error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Server error']);
        }
    }

    /**
     * Login user
     */
    private function login() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';

        if (empty($username) || empty($password)) {
            http_response_code(400);
            echo json_encode(['message' => 'Username and password are required']);
            return;
        }

        try {
            // Get user from database
            $stmt = $this->db->prepare("SELECT id, username, password, role FROM users WHERE username = ?");
            $stmt->execute([$username]);
            $user = $stmt->fetch();

            if (!$user || !password_verify($password, $user['password'])) {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid credentials']);
                return;
            }

            // Store user in session
            $_SESSION['user'] = [
                'id' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role']
            ];

            echo json_encode([
                'success' => true,
                'user' => $_SESSION['user']
            ]);

        } catch (Exception $e) {
            error_log("Login error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Server error']);
        }
    }

    /**
     * Logout user
     */
    private function logout() {
        // Destroy session
        session_destroy();
        
        echo json_encode([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    }
}
?>