<?php
/**
 * Simple authentication middleware without JWT
 */
class AuthMiddleware {
    
    public function __construct() {
        // Start session if not already started
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    /**
     * Simple session-based authentication
     */
    public function authenticate() {
        if (!isset($_SESSION['user'])) {
            http_response_code(401);
            echo json_encode(['message' => 'No session found']);
            exit();
        }

        return $_SESSION['user'];
    }

    /**
     * Check if user has required role
     */
    public function requireRole($user, $requiredRole) {
        if ($user['role'] !== $requiredRole) {
            http_response_code(403);
            echo json_encode(['message' => 'Insufficient permissions']);
            exit();
        }
    }
}
?>