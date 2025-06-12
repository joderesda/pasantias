# Form Builder - PHP Backend

This project has been migrated from Node.js/Express to PHP with MySQL.

## Setup Instructions

### 1. Database Setup
1. Create a MySQL database named `form_builder`
2. Import the schema: `mysql -u root -p form_builder < database/mysql_schema.sql`
3. Update database credentials in `api/.env`

### 2. PHP Dependencies
```bash
cd api
composer install
```

### 3. Environment Configuration
1. Copy `api/.env.example` to `api/.env`
2. Update the database credentials and JWT secret

### 4. Web Server Configuration
For LiteSpeed/Apache, ensure the document root points to the project root, and the `api/.htaccess` file handles routing.

### 5. Frontend Configuration
Update the API base URL in your frontend to point to `/api` (or wherever your PHP API is hosted).

## API Endpoints

All endpoints remain the same as the Node.js version:

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/forms` - Get all forms
- `POST /api/forms` - Create form (admin only)
- `GET /api/forms/{id}` - Get specific form
- `PUT /api/forms/{id}` - Update form (admin only)
- `DELETE /api/forms/{id}` - Delete form (admin only)
- `GET /api/forms/{id}/responses` - Get form responses
- `POST /api/responses` - Submit response
- `DELETE /api/responses/{id}` - Delete response
- `POST /api/responses/import` - Import responses

## Default Admin User
- Username: `admin`
- Password: `admin123`

**Important:** Change the default admin password in production!