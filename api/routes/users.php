<?php

require_once __DIR__ . '/../config/database.php';

class UsersRoutes {
    private $db;
    private $pdo;

    public function __construct() {
        $this->db = new Database();
        $this->pdo = $this->db->getConnection();
    }

    public function handleRequest($method, $endpoint, $id = null) {
        // Security check: only admins can access these routes
        if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['message' => 'Forbidden: Administrator access required.']);
            return;
        }

        switch ($method) {
            case 'GET':
                if ($endpoint === '/users' && $id === null) {
                    $this->getAllUsers();
                }
                break;
            case 'PUT':
                if ($endpoint === '/users' && $id !== null) {
                    $this->updateUserRole($id);
                }
                break;
            default:
                http_response_code(405);
                echo json_encode(['message' => 'Method Not Allowed']);
                break;
        }
    }

    private function getAllUsers() {
        try {
            $stmt = $this->pdo->prepare("SELECT id, username, role FROM users ORDER BY username");
            $stmt->execute();
            $users = $stmt->fetchAll();
            echo json_encode($users);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['message' => 'Error fetching users: ' . $e->getMessage()]);
        }
    }

    private function updateUserRole($id) {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['role']) || !in_array($data['role'], ['user', 'admin', 'analista'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Invalid role provided.']);
            return;
        }

        try {
            $stmt = $this->pdo->prepare("UPDATE users SET role = ? WHERE id = ?");
            $stmt->execute([$data['role'], $id]);

            if ($stmt->rowCount() > 0) {
                echo json_encode(['message' => 'User role updated successfully.']);
            } else {
                http_response_code(404);
                echo json_encode(['message' => 'User not found or role is already set.']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['message' => 'Error updating user role: ' . $e->getMessage()]);
        }
    }
}
