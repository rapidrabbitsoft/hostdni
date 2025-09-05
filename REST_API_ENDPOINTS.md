# HostDNI REST API Documentation

## Overview

HostDNI provides a REST API for managing the system hosts file, backups, allow lists, and block lists. The API runs on `http://127.0.0.1:8080` alongside the Tauri application.

## Authentication

HostDNI uses a rotating API token system. Include the access token in the Authorization header:

```
Authorization: Bearer <your-access-token>
```

## Base URL
```
http://127.0.0.1:8080/api
```

## Host Entries Endpoints

### GET /api/etc/hosts
Get all host entries (from `/etc/hosts`).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "entry-1",
      "ip": "127.0.0.1",
      "hostname": "localhost",
      "comment": "Localhost entry",
      "enabled": true,
      "created_at": "2023-12-21T10:00:00Z",
      "updated_at": "2023-12-21T10:00:00Z"
    }
  ],
  "message": null,
  "error": null
}
```

---

### POST /api/etc/hosts
Add new host entries (writes to `/etc/hosts`).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
[{
  "ip": "192.168.1.100",
  "hostname": "example.com",
  "comment": "Example domain",
  "enabled": true
}]
```

**Response:**
```json
{
  "success": true,
  "message": "Host entries created successfully",
  "error": null
}
```

---

### GET /api/etc/hosts/count
Get the total count of host entries.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": 123,
  "message": null,
  "error": null
}
```

---

### GET /api/etc/hosts/stream?page=0&page_size=20000
Stream host entries in chunks (for lazy loading).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (default: 0)
- `page_size` (default: 1000, max: 20000)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "ip": "127.0.0.1",
      "hostname": "localhost",
      "comment": "Localhost entry",
      "enabled": true
    }
    // ... up to page_size entries
  ],
  "message": null,
  "error": null
}
```

---

## Backups Endpoints

### GET /api/backups
Get all backup configurations.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "backup-1",
      "name": "Daily Backup",
      "description": "Daily hosts file backup",
      "created_at": "2023-12-21T10:00:00Z",
      "entries_count": 150
    }
  ],
  "message": null,
  "error": null
}
```

### POST /api/backups
Create a new backup.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Weekly Backup",
  "description": "Weekly hosts file backup"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "name": "Weekly Backup",
    "description": "Weekly hosts file backup",
    "created_at": "2023-12-21T10:00:00Z",
    "entries_count": 150
  },
  "message": "Backup created successfully",
  "error": null
}
```

---

## Allow Lists Endpoints

### GET /api/allow-lists
Get all allow list entries.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "allow-1",
      "pattern": "*.example.com",
      "description": "Allow example.com and subdomains",
      "enabled": true,
      "created_at": "2023-12-21T10:00:00Z"
    }
  ],
  "message": null,
  "error": null
}
```

---

## Block Lists Endpoints

### GET /api/block-lists
Get all block list entries.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "block-1",
      "pattern": "*.ads.com",
      "description": "Block advertising domains",
      "enabled": true,
      "created_at": "2023-12-21T10:00:00Z"
    }
  ],
  "message": null,
  "error": null
}
```

---

## System Endpoints

### GET /api/health
Health check endpoint (no authentication required).

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2023-12-21T10:00:00Z",
    "version": "0.9.0"
  },
  "message": "Service is healthy",
  "error": null
}
```

### GET /api/stats
Get system statistics.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "host_entries": 150,
    "backups": 5,
    "allow_lists": 10,
    "block_lists": 25,
    "timestamp": "2023-12-21T10:00:00Z"
  },
  "message": null,
  "error": null
}
```

---

## Error Responses

All endpoints return consistent error responses:

### Authentication Error (401)
```json
{
  "success": false,
  "data": null,
  "message": null,
  "error": "Authentication required"
}
```

### Not Found Error (404)
```json
{
  "success": false,
  "data": null,
  "message": null,
  "error": "Resource not found"
}
```

### Validation Error (400)
```json
{
  "success": false,
  "data": null,
  "message": null,
  "error": "Invalid request data"
}
```

### Server Error (500)
```json
{
  "success": false,
  "data": null,
  "message": null,
  "error": "Internal server error"
}
```

---

## Testing the API

### Using curl

1. **Login to get access and refresh tokens:**
```bash
curl -X POST http://127.0.0.1:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123", "grant_type": "password"}'
```

2. **Use the access token to access protected endpoints:**
```bash
curl -X GET http://127.0.0.1:8080/api/etc/hosts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

3. **Refresh the access token when it expires:**
```bash
curl -X POST http://127.0.0.1:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "YOUR_REFRESH_TOKEN_HERE", "grant_type": "refresh_token"}'
```

4. **Revoke tokens (logout):**
```bash
curl -X POST http://127.0.0.1:8080/api/auth/revoke \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

---

### Using Postman

1. Set the base URL to `http://127.0.0.1:8080/api`
2. For authentication, use the login endpoint to get a token
3. Add the token to the Authorization header for all other requests
4. Use the endpoints documented above

---

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Passwords are hashed using bcrypt
- **CORS Support**: Configured for cross-origin requests
- **Input Validation**: All inputs are validated before processing
- **Error Handling**: Comprehensive error handling and logging

---

## Development Notes

- The API runs on port 8080 alongside the Tauri application
- All data is stored in memory (for development; use a database in production)
- JWT tokens expire after 24 hours 