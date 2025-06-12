<?php
/**
 * Simple headers configuration without CORS
 */

function setBasicHeaders() {
    // Set basic content type
    header("Content-Type: application/json");
    
    // Handle preflight requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}
?>