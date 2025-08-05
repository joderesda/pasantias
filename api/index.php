<?php

// Log de diagnóstico para cada petición
$log_file_index = __DIR__ . '/debug_index.log';
$request_info = sprintf(
    "[%s] Method: %s, URI: %s, Payload: %s\n",
    date('Y-m-d H:i:s'),
    $_SERVER['REQUEST_METHOD'],
    $_SERVER['REQUEST_URI'],
    file_get_contents('php://input')
);
file_put_contents($log_file_index, $request_info, FILE_APPEND);
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/routes/auth.php';
require_once __DIR__ . '/routes/forms.php';
require_once __DIR__ . '/routes/responses.php';
require_once __DIR__ . '/routes/users.php';

// Start session
session_start();

// Load environment variables if .env file exists
if (file_exists(__DIR__ . '/.env')) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
}

// Set basic headers
setBasicHeaders();

// Get request method and URI
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Remove /api prefix if present
$uri = preg_replace('#^/api#', '', $uri);

// Route the request
try {
    if (preg_match('#^/auth/(.+)$#', $uri, $matches)) {
        // Authentication routes
        $authRoutes = new AuthRoutes();
        $authRoutes->handleRequest($method, '/' . $matches[1]);
        
    } elseif ($uri === '/forms/stats/weekly') {
        // Weekly form stats route
        $formsRoutes = new FormsRoutes();
        $formsRoutes->handleRequest($method, 'stats/weekly');
        
    } elseif (preg_match('#^/forms/([^/]+)/responses$#', $uri, $matches)) {
        // Form responses routes
        $responsesRoutes = new ResponsesRoutes();
        $responsesRoutes->handleRequest($method, '/form-responses', $matches[1]);
        
    } elseif (preg_match('#^/forms/([^/]+)$#', $uri, $matches)) {
        // Single form routes
        $formsRoutes = new FormsRoutes();
        $formsRoutes->handleRequest($method, null, $matches[1]);
        
    } elseif ($uri === '/forms') {
        // Forms collection routes
        $formsRoutes = new FormsRoutes();
        $formsRoutes->handleRequest($method, null);
        
    } elseif ($uri === '/responses/import') {
        // Import responses
        $responsesRoutes = new ResponsesRoutes();
        $responsesRoutes->handleRequest($method, '/responses/import');

    } elseif (preg_match('#^/responses/([^/]+)$#', $uri, $matches)) {
        // Single response routes (for updates and deletes)
        $responsesRoutes = new ResponsesRoutes();
        $responsesRoutes->handleRequest($method, '/responses', null, $matches[1]);

    } elseif ($uri === '/responses') {
        // Responses collection routes
        $responsesRoutes = new ResponsesRoutes();
        $responsesRoutes->handleRequest($method, '/responses');
        
    } elseif (preg_match('#^/users(?:/([^/]+))?$#', $uri, $matches)) {
        $userId = $matches[1] ?? null;
        $usersRoutes = new UsersRoutes();
        $usersRoutes->handleRequest($method, '/users', $userId);

    } else {
        // Route not found
        http_response_code(404);
        echo json_encode(['message' => 'API endpoint not found']);
    }
    
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['message' => 'Internal server error']);
}
?>