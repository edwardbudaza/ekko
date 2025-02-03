# Route Guide: Setting Up and Using the Hierarchical Structure System

This guide provides detailed instructions for using each route in the system, from initial setup to daily operations.

## Authentication Routes

### 1. Register Admin User

**Route**: `POST /auth/register`

```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "Admin123!",
  "firstName": "Admin",
  "lastName": "User",
  "role": "admin"
}
```

**Response**:

```json
{
  "access_token": "eyJhbGciOiJIUzI1...",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### 2. Login

**Route**: `POST /auth/login`

```http
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "Admin123!"
}
```

**Response**:

```json
{
  "access_token": "eyJhbGciOiJIUzI1..."
}
```

## Structure Management Routes

### 1. Create National Structure

**Route**: `POST /structures`
**Required Role**: `admin`

```http
POST http://localhost:3000/structures
Authorization: Bearer your_token
Content-Type: application/json

{
  "name": "National Headquarters",
  "level": "NATIONAL",
  "metadata": {
    "description": "Top level organization",
    "country": "Australia"
  }
}
```

**Response**:

```json
{
  "id": "national-uuid",
  "name": "National Headquarters",
  "level": "NATIONAL",
  "metadata": {
    "description": "Top level organization",
    "country": "Australia"
  }
}
```

### 2. Create City Structure

**Route**: `POST /structures`
**Required Role**: `admin` or `national`

```http
POST http://localhost:3000/structures
Authorization: Bearer your_token
Content-Type: application/json

{
  "name": "Sydney Office",
  "level": "CITY",
  "parentId": "national-uuid",
  "metadata": {
    "state": "NSW",
    "type": "regional_office"
  }
}
```

### 3. Create Suburb Structure

**Route**: `POST /structures`
**Required Role**: `admin`, `national`, or `city`

```http
POST http://localhost:3000/structures
Authorization: Bearer your_token
Content-Type: application/json

{
  "name": "Parramatta Branch",
  "level": "SUBURB",
  "parentId": "city-uuid",
  "metadata": {
    "postcode": "2150",
    "type": "local_office"
  }
}
```

### 4. View Structures

**Route**: `GET /structures`
**Access**: All authenticated users

```http
GET http://localhost:3000/structures
Authorization: Bearer your_token
```

### 5. View Structure Descendants

**Route**: `GET /structures/{id}/descendants`
**Access**: Users with access to the structure

```http
GET http://localhost:3000/structures/national-uuid/descendants
Authorization: Bearer your_token
```

## User Management Routes

### 1. Create National User

**Route**: `POST /users`
**Required Role**: `admin`

```http
POST http://localhost:3000/users
Authorization: Bearer your_token
Content-Type: application/json

{
  "email": "national@example.com",
  "password": "National123!",
  "firstName": "National",
  "lastName": "Manager",
  "role": "national",
  "structureId": "national-uuid"
}
```

### 2. Create City User

**Route**: `POST /users`
**Required Role**: `admin` or `national`

```http
POST http://localhost:3000/users
Authorization: Bearer your_token
Content-Type: application/json

{
  "email": "sydney@example.com",
  "password": "Sydney123!",
  "firstName": "Sydney",
  "lastName": "Manager",
  "role": "city",
  "structureId": "city-uuid"
}
```

### 3. View Users

**Route**: `GET /users`
**Access**: All authenticated users (filtered by structure access)

```http
GET http://localhost:3000/users
Authorization: Bearer your_token
```

### 4. Update User

**Route**: `PUT /users/{id}`
**Access**: Users with access to the user's structure

```http
PUT http://localhost:3000/users/user-uuid
Authorization: Bearer your_token
Content-Type: application/json

{
  "firstName": "Updated",
  "lastName": "Name"
}
```

## Common Operations Guide

### Setting Up Initial Structure

1. Register admin user
2. Login as admin
3. Create national structure
4. Create city structures under national
5. Create suburb structures under cities

### Creating User Hierarchy

1. Create national users (by admin)
2. Create city users (by admin or national)
3. Create suburb users (by admin, national, or city)

### Access Patterns

- **Admin**: Can access everything
- **National**: Can access their structure and all descendants
- **City**: Can access their city structure and suburb descendants
- **Suburb**: Can only access their suburb structure

### Best Practices

1. **Structure Creation**

   - Always create from top to bottom
   - Use meaningful names and metadata
   - Document structure IDs

2. **User Management**

   - Use strong passwords
   - Assign appropriate roles
   - Regularly review access

3. **Security**
   - Keep tokens secure
   - Regularly rotate passwords
   - Monitor access patterns

### Troubleshooting

1. **Authentication Issues**

   - Verify token format (Bearer prefix)
   - Check token expiration
   - Confirm user credentials

2. **Permission Issues**

   - Verify user role
   - Check structure access
   - Confirm parent-child relationships

3. **Structure Issues**
   - Verify structure exists
   - Check parent structure
   - Confirm structure level
