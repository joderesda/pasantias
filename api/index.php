<?php
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/routes/auth.php';
require_once __DIR__ . '/routes/forms.php';
require_once __DIR__ . '/routes/responses.php';

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
        
    } elseif (preg_match('#^/forms/([^/]+)/responses$#', $uri, $matches)) {
        // Form responses routes
        $responsesRoutes = new ResponsesRoutes();
        $responsesRoutes->handleRequest($method, '/form-responses', $matches[1]);
        
    } elseif (preg_match('#^/forms/([^/]+)$#', $uri, $matches)) {
        // Single form routes
        $formsRoutes = new FormsRoutes();
        $formsRoutes->handleRequest($method, '/forms', $matches[1]);
        
    } elseif ($uri === '/forms') {
        // Forms collection routes
        $formsRoutes = new FormsRoutes();
        $formsRoutes->handleRequest($method, '/forms');
        
    } elseif (preg_match('#^/responses/([^/]+)$#', $uri, $matches)) {
        // Single response routes
        $responsesRoutes = new ResponsesRoutes();
        $responsesRoutes->handleRequest($method, '/responses', null, $matches[1]);
        
    } elseif ($uri === '/responses' || $uri === '/responses/import') {
        // Responses collection routes
        $responsesRoutes = new ResponsesRoutes();
        $responsesRoutes->handleRequest($method, $uri);
        
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